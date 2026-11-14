"""
Database utilities and multi-tenant schema manager for AMS Cloud.
Supports both SQLite (local development and persistent container volumes)
and PostgreSQL (enterprise production deployments via DATABASE_URL).
"""

import os
import sqlite3
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB_PATH = os.environ.get('DB_PATH') or os.path.join(BASE_DIR, "sqlite_exports", "attendance_data.db")
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

# In serverless environments (like Vercel), copy db to /tmp if needed
if os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
    import shutil
    tmp_db_dir = "/tmp/sqlite_exports"
    tmp_db = os.path.join(tmp_db_dir, "attendance_data.db")
    try:
        os.makedirs(tmp_db_dir, exist_ok=True)
        if not os.path.exists(tmp_db) and os.path.exists(DB_PATH):
            shutil.copy2(DB_PATH, tmp_db)
        if os.path.exists(tmp_db):
            DB_PATH = tmp_db
    except Exception as e:
        logger.warning(f"Could not copy database to /tmp: {e}")


def get_db_connection():
    """
    Returns a connection to the SQLite database with Row factory.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        logger.error(f"Error connecting to database at {DB_PATH}: {e}")
        return None


def init_db_schema():
    """
    Initializes normalized multi-tenant tables:
    - Companies (tenants, shift settings, credentials)
    - Users (enrolled employees / students)
    - AttendanceRecords (normalized daily check-in / check-out records)
    - Leaves (monthly leave balance tracking)
    - SalaryStructures (payroll compensation configurations)
    - PayrollRuns (monthly payroll run batches)
    - Payslips (individual employee monthly itemized payslips)
    """
    conn = get_db_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()

        # 1. Companies / Tenants Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Companies (
                "Company ID" TEXT PRIMARY KEY,
                "Company Name" TEXT,
                "Username" TEXT UNIQUE,
                "Password" TEXT,
                "Leaves Per Month" TEXT DEFAULT '2',
                "Address" TEXT,
                "Contact" TEXT,
                "Email" TEXT,
                "Check In Time" TEXT DEFAULT '10:00:00',
                "Check Out Time" TEXT DEFAULT '18:30:00',
                "Required Hours" TEXT DEFAULT '7.0'
            )
        """)

        # Add missing columns to Companies if needed
        cursor.execute("PRAGMA table_info(Companies)")
        existing_cols = [col[1] for col in cursor.fetchall()]
        column_defs = {
            "Check In Time": "TEXT DEFAULT '10:00:00'",
            "Check Out Time": "TEXT DEFAULT '18:30:00'",
            "Required Hours": "TEXT DEFAULT '7.0'",
            "Leaves Per Month": "TEXT DEFAULT '2'",
            "Address": "TEXT",
            "Contact": "TEXT",
            "Email": "TEXT"
        }
        for col_name, col_def in column_defs.items():
            if col_name not in existing_cols:
                try:
                    cursor.execute(f'ALTER TABLE Companies ADD COLUMN "{col_name}" {col_def}')
                except Exception as ex:
                    logger.warning(f"Could not add column {col_name}: {ex}")

        # 2. Users / Enrolled Members Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                "Company ID" TEXT NOT NULL,
                "User Name" TEXT NOT NULL,
                UNIQUE("Company ID", "User Name")
            )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_comp ON Users("Company ID")')

        # 3. Normalized Attendance Records Table (Replaces the column-per-day anti-pattern)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AttendanceRecords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                date TEXT NOT NULL,
                in_time TEXT DEFAULT '',
                out_time TEXT DEFAULT '',
                status TEXT DEFAULT 'Absent',
                expected_checkout TEXT DEFAULT '',
                hours TEXT DEFAULT '0',
                day_status TEXT DEFAULT 'Absent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_name, date)
            )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_att_comp_date ON AttendanceRecords(company_id, date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_att_comp_user ON AttendanceRecords(company_id, user_name)')

        # 4. Leaves Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Leaves (
                "Company ID" TEXT,
                "User Name" TEXT,
                "Year-Month" TEXT,
                "Leaves Allowed" INTEGER DEFAULT 2,
                "Leaves Taken" INTEGER DEFAULT 0,
                "Leaves Carried" INTEGER DEFAULT 0,
                UNIQUE("Company ID", "User Name", "Year-Month")
            )
        """)

        # 5. Salary Structures Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS SalaryStructures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                base_salary REAL DEFAULT 25000.0,
                hra REAL DEFAULT 5000.0,
                allowances REAL DEFAULT 2000.0,
                pf_enabled INTEGER DEFAULT 1,
                tax_rate REAL DEFAULT 5.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_name)
            )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sal_comp_user ON SalaryStructures(company_id, user_name)')

        # 6. Payroll Runs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS PayrollRuns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                total_employees INTEGER DEFAULT 0,
                total_gross REAL DEFAULT 0.0,
                total_deductions REAL DEFAULT 0.0,
                total_net REAL DEFAULT 0.0,
                status TEXT DEFAULT 'Processed',
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, month, year)
            )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_payroll_comp ON PayrollRuns(company_id, year, month)')

        # 7. Payslips Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Payslips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payroll_run_id INTEGER,
                company_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                working_days INTEGER DEFAULT 0,
                present_days REAL DEFAULT 0.0,
                half_days INTEGER DEFAULT 0,
                absent_days REAL DEFAULT 0.0,
                paid_leave_days REAL DEFAULT 0.0,
                lop_days REAL DEFAULT 0.0,
                base_salary REAL DEFAULT 0.0,
                hra REAL DEFAULT 0.0,
                allowances REAL DEFAULT 0.0,
                gross_pay REAL DEFAULT 0.0,
                lop_deduction REAL DEFAULT 0.0,
                pf_deduction REAL DEFAULT 0.0,
                tax_deduction REAL DEFAULT 0.0,
                net_pay REAL DEFAULT 0.0,
                status TEXT DEFAULT 'Generated',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(payroll_run_id) REFERENCES PayrollRuns(id)
            )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_payslips_run ON Payslips(payroll_run_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_payslips_comp ON Payslips(company_id, year, month)')

        conn.commit()
        logger.info("Normalized database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing DB schema: {e}")
    finally:
        conn.close()


def fetch_user_by_username(username):
    """
    Fetch tenant company data from the database by username or email.
    Supports case-insensitive matching and whitespace trimming.
    """
    if not username:
        return None
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cleaned = username.strip()
            cursor.execute("""
                SELECT * FROM Companies 
                WHERE LOWER(TRIM(Username)) = LOWER(?)
                   OR LOWER(TRIM(Email)) = LOWER(?)
            """, (cleaned, cleaned))
            user_data = cursor.fetchone()
            return dict(user_data) if user_data else None
        except sqlite3.Error as e:
            logger.error(f"Error querying Companies table: {e}")
            return None
        finally:
            conn.close()
    return None


def fetch_company_users(company_id):
    """
    Fetch all enrolled users for a given company.
    Queries the normalized Users table.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT "User Name" AS Name FROM Users WHERE "Company ID" = ? ORDER BY "User Name" ASC', (company_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            logger.error(f"Error fetching company users: {e}")
            return []
        finally:
            conn.close()
    return []


def delete_user_from_company(company_id, username):
    """
    Delete a user from the normalized Users table, AttendanceRecords,
    Leaves, and SalaryStructures.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM Users WHERE "Company ID" = ? AND "User Name" = ?', (company_id, username))
            cursor.execute('DELETE FROM AttendanceRecords WHERE company_id = ? AND user_name = ?', (company_id, username))
            cursor.execute('DELETE FROM Leaves WHERE "Company ID" = ? AND "User Name" = ?', (company_id, username))
            cursor.execute('DELETE FROM SalaryStructures WHERE company_id = ? AND user_name = ?', (company_id, username))
            conn.commit()
            logger.info(f"User {username} deleted from company {company_id}.")
            return True
        except sqlite3.Error as e:
            logger.error(f"Error deleting user {username} for company {company_id}: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    return False


def read_attendance_from_db(company_id):
    """
    Fetch all attendance records for a company from AttendanceRecords.
    Returns list of [user_name, date, in_time, out_time, status, expected_checkout, hours, day_status].
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_name, date, in_time, out_time, status, expected_checkout, hours, day_status
                FROM AttendanceRecords
                WHERE company_id = ?
                ORDER BY date DESC, user_name ASC
            """, (company_id,))
            rows = cursor.fetchall()
            return [
                [
                    row['user_name'],
                    row['date'],
                    row['in_time'] or '',
                    row['out_time'] or '',
                    row['status'] or 'Absent',
                    row['expected_checkout'] or '',
                    row['hours'] or '0',
                    row['day_status'] or 'Absent'
                ]
                for row in rows
            ]
        except sqlite3.Error as e:
            logger.error(f"Error fetching attendance data for {company_id}: {e}")
            return []
        finally:
            conn.close()
    return []


def upsert_attendance_record(company_id, user_name, date_str, in_time='', out_time='', status='Absent', expected_checkout='', hours='0', day_status='Absent'):
    """
    Insert or update a single daily attendance record atomically.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO AttendanceRecords (company_id, user_name, date, in_time, out_time, status, expected_checkout, hours, day_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(company_id, user_name, date) DO UPDATE SET
                    in_time = excluded.in_time,
                    out_time = excluded.out_time,
                    status = excluded.status,
                    expected_checkout = excluded.expected_checkout,
                    hours = excluded.hours,
                    day_status = excluded.day_status
            """, (company_id, user_name, date_str, in_time, out_time, status, expected_checkout, hours, day_status))
            conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Error upserting attendance record: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    return False


def get_salary_structure(company_id, user_name):
    """
    Fetch an employee's salary configuration.
    Returns defaults if not explicitly configured.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT base_salary, hra, allowances, pf_enabled, tax_rate
                FROM SalaryStructures
                WHERE company_id = ? AND user_name = ?
            """, (company_id, user_name))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return {
                'base_salary': 25000.0,
                'hra': 5000.0,
                'allowances': 2000.0,
                'pf_enabled': 1,
                'tax_rate': 5.0
            }
        finally:
            conn.close()
    return {'base_salary': 25000.0, 'hra': 5000.0, 'allowances': 2000.0, 'pf_enabled': 1, 'tax_rate': 5.0}


def upsert_salary_structure(company_id, user_name, base_salary, hra=5000.0, allowances=2000.0, pf_enabled=1, tax_rate=5.0):
    """
    Save or update an employee's salary configuration.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO SalaryStructures (company_id, user_name, base_salary, hra, allowances, pf_enabled, tax_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(company_id, user_name) DO UPDATE SET
                    base_salary = excluded.base_salary,
                    hra = excluded.hra,
                    allowances = excluded.allowances,
                    pf_enabled = excluded.pf_enabled,
                    tax_rate = excluded.tax_rate
            """, (company_id, user_name, float(base_salary), float(hra), float(allowances), int(pf_enabled), float(tax_rate)))
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving salary structure: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    return False


def get_all_salary_structures(company_id):
    """
    Return all configured salary structures for a company.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_name, base_salary, hra, allowances, pf_enabled, tax_rate
                FROM SalaryStructures
                WHERE company_id = ?
            """, (company_id,))
            rows = cursor.fetchall()
            return {row['user_name']: dict(row) for row in rows}
        finally:
            conn.close()
    return {}


def save_payroll_run(company_id, month, year, run_data, payslips_data):
    """
    Saves a completed monthly payroll run batch and associated payslips atomically.
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        # Upsert PayrollRuns
        cursor.execute("""
            INSERT INTO PayrollRuns (company_id, month, year, total_employees, total_gross, total_deductions, total_net, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(company_id, month, year) DO UPDATE SET
                total_employees = excluded.total_employees,
                total_gross = excluded.total_gross,
                total_deductions = excluded.total_deductions,
                total_net = excluded.total_net,
                status = excluded.status,
                processed_at = CURRENT_TIMESTAMP
        """, (
            company_id,
            int(month),
            int(year),
            run_data.get('total_employees', 0),
            run_data.get('total_gross', 0.0),
            run_data.get('total_deductions', 0.0),
            run_data.get('total_net', 0.0),
            run_data.get('status', 'Processed')
        ))

        # Retrieve the run ID
        cursor.execute("SELECT id FROM PayrollRuns WHERE company_id = ? AND month = ? AND year = ?", (company_id, int(month), int(year)))
        run_id = cursor.fetchone()['id']

        # Clear previous payslips for this run if re-calculating
        cursor.execute("DELETE FROM Payslips WHERE payroll_run_id = ?", (run_id,))

        # Insert new payslips
        for p in payslips_data:
            cursor.execute("""
                INSERT INTO Payslips (
                    payroll_run_id, company_id, user_name, month, year,
                    working_days, present_days, half_days, absent_days, paid_leave_days, lop_days,
                    base_salary, hra, allowances, gross_pay, lop_deduction, pf_deduction, tax_deduction, net_pay, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id,
                company_id,
                p['user_name'],
                int(month),
                int(year),
                p.get('working_days', 0),
                p.get('present_days', 0.0),
                p.get('half_days', 0),
                p.get('absent_days', 0.0),
                p.get('paid_leave_days', 0.0),
                p.get('lop_days', 0.0),
                p.get('base_salary', 0.0),
                p.get('hra', 0.0),
                p.get('allowances', 0.0),
                p.get('gross_pay', 0.0),
                p.get('lop_deduction', 0.0),
                p.get('pf_deduction', 0.0),
                p.get('tax_deduction', 0.0),
                p.get('net_pay', 0.0),
                p.get('status', 'Generated')
            ))

        conn.commit()
        return run_id
    except Exception as e:
        logger.error(f"Error saving payroll run: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def get_payroll_runs(company_id):
    """
    Get all historical payroll runs for a tenant.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, company_id, month, year, total_employees, total_gross, total_deductions, total_net, status, processed_at
                FROM PayrollRuns
                WHERE company_id = ?
                ORDER BY year DESC, month DESC
            """, (company_id,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    return []


def get_payslips_for_run(company_id, run_id):
    """
    Get all payslips associated with a specific payroll run.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM Payslips
                WHERE company_id = ? AND payroll_run_id = ?
                ORDER BY user_name ASC
            """, (company_id, run_id))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    return []
