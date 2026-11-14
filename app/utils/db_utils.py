"""
Database utilities and multi-tenant schema manager for AMS Cloud.
100% Pure PostgreSQL architecture for development and production (Render).
"""

import os
import psycopg2
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Default to local PostgreSQL on Windows; Render injects DATABASE_URL automatically
DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://postgres:root@localhost:5432/attendify_db'


class DBRow(dict):
    """
    Hybrid Row object allowing column access by:
    - Exact column name: row['Company ID']
    - Lowercase column name: row['company id']
    - Snake case column name: row['company_id']
    - Integer column index: row[0], row[1]
    - Dict methods: row.get('key'), dict(row)
    """
    def __init__(self, description, values):
        super().__init__()
        self._values = tuple(values)
        if description:
            for i, col in enumerate(description):
                col_name = col.name if hasattr(col, 'name') else col[0]
                val = values[i]
                self[col_name] = val
                self[col_name.lower()] = val
                self[col_name.replace(' ', '_').lower()] = val

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._values[item]
        return super().__getitem__(item)


class PGCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, query, params=None):
        if isinstance(query, str) and '?' in query and params is not None:
            # Safely replace unescaped ? with %s for PostgreSQL compatibility
            query = query.replace('?', '%s')
        return self._cursor.execute(query, params)

    def executemany(self, query, seq_of_params):
        if isinstance(query, str) and '?' in query:
            query = query.replace('?', '%s')
        return self._cursor.executemany(query, seq_of_params)

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        return DBRow(self._cursor.description, row)

    def fetchall(self):
        desc = self._cursor.description
        if not desc:
            return []
        return [DBRow(desc, r) for r in self._cursor.fetchall()]

    def fetchmany(self, size=None):
        desc = self._cursor.description
        if not desc:
            return []
        rows = self._cursor.fetchmany(size) if size else self._cursor.fetchmany()
        return [DBRow(desc, r) for r in rows]

    @property
    def lastrowid(self):
        return getattr(self._cursor, 'lastrowid', None)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class PGConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return PGCursorWrapper(self._conn.cursor())

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)


def get_db_connection():
    """
    Returns a connection to the PostgreSQL database with hybrid row factory.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return PGConnectionWrapper(conn)
    except Exception as e:
        logger.error(f"Error connecting to PostgreSQL database at {DATABASE_URL.split('@')[-1]}: {e}")
        return None


def init_db_schema():
    """
    Initializes PostgreSQL multi-tenant tables:
    - Companies (tenants, shift settings, credentials)
    - Users (enrolled employees / students)
    - AttendanceRecords (normalized daily check-in / check-out records)
    - Leaves (monthly leave balance tracking)
    - SalaryStructures (payroll compensation configurations)
    - PayrollRuns (monthly payroll run batches)
    - Payslips (individual employee monthly itemized payslips)
    - FaceEmbeddings (persistent biometric 128-d vectors)
    """
    conn = get_db_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()

        # 1. Companies Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Companies (
                "Company ID" VARCHAR(100) PRIMARY KEY,
                "Company Name" VARCHAR(255),
                "Username" VARCHAR(100) UNIQUE,
                "Password" TEXT,
                "Leaves Per Month" VARCHAR(20) DEFAULT '2',
                "Address" TEXT DEFAULT '',
                "Contact" VARCHAR(100) DEFAULT '',
                "Email" VARCHAR(150) DEFAULT '',
                "Check In Time" VARCHAR(20) DEFAULT '09:00:00',
                "Check Out Time" VARCHAR(20) DEFAULT '18:00:00',
                "Required Hours" VARCHAR(20) DEFAULT '8.0',
                "Currency" VARCHAR(10) DEFAULT '₹',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                "Company ID" VARCHAR(100) NOT NULL REFERENCES Companies("Company ID") ON DELETE CASCADE,
                "User Name" VARCHAR(150) NOT NULL,
                UNIQUE("Company ID", "User Name")
            );
        """)

        # 3. Attendance Records Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AttendanceRecords (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                date VARCHAR(20) NOT NULL,
                in_time VARCHAR(20) DEFAULT '',
                out_time VARCHAR(20) DEFAULT '',
                status VARCHAR(50) DEFAULT 'Absent',
                expected_checkout VARCHAR(20) DEFAULT '',
                hours VARCHAR(20) DEFAULT '0',
                day_status VARCHAR(50) DEFAULT 'Absent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_name, date)
            );
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_att_comp_date ON AttendanceRecords(company_id, date);')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_att_comp_user ON AttendanceRecords(company_id, user_name);')

        # 4. Leaves Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Leaves (
                id SERIAL PRIMARY KEY,
                "Company ID" VARCHAR(100) NOT NULL,
                "User Name" VARCHAR(150) NOT NULL,
                "Year-Month" VARCHAR(20) NOT NULL,
                "Leaves Allowed" VARCHAR(20) DEFAULT '2',
                "Leaves Taken" VARCHAR(20) DEFAULT '0',
                "Leaves Carried" VARCHAR(20) DEFAULT '0',
                UNIQUE("Company ID", "User Name", "Year-Month")
            );
        """)

        # 5. Salary Structures Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS SalaryStructures (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                base_salary NUMERIC(12, 2) DEFAULT 25000.0,
                hra NUMERIC(12, 2) DEFAULT 5000.0,
                allowances NUMERIC(12, 2) DEFAULT 2000.0,
                pf_enabled INTEGER DEFAULT 1,
                tax_rate NUMERIC(5, 2) DEFAULT 5.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                conveyance_allowance NUMERIC(12, 2) DEFAULT 0.0,
                special_allowance NUMERIC(12, 2) DEFAULT 0.0,
                pf_rate NUMERIC(5, 2) DEFAULT 12.0,
                bank_name VARCHAR(100) DEFAULT '',
                account_number VARCHAR(100) DEFAULT '',
                ifsc_code VARCHAR(50) DEFAULT '',
                payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
                UNIQUE(company_id, user_name)
            );
        """)

        # 6. Payroll Runs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS PayrollRuns (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                total_employees INTEGER DEFAULT 0,
                total_gross NUMERIC(14, 2) DEFAULT 0.0,
                total_deductions NUMERIC(14, 2) DEFAULT 0.0,
                total_net NUMERIC(14, 2) DEFAULT 0.0,
                status VARCHAR(50) DEFAULT 'Completed',
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                working_days INTEGER DEFAULT 26,
                processed_by VARCHAR(100) DEFAULT 'Admin',
                paid_at TIMESTAMP,
                notes TEXT DEFAULT '',
                UNIQUE(company_id, month, year)
            );
        """)

        # 7. Payslips Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Payslips (
                id SERIAL PRIMARY KEY,
                payroll_run_id INTEGER REFERENCES PayrollRuns(id) ON DELETE CASCADE,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                working_days INTEGER DEFAULT 26,
                present_days NUMERIC(5, 2) DEFAULT 0,
                half_days INTEGER DEFAULT 0,
                absent_days NUMERIC(5, 2) DEFAULT 0,
                paid_leave_days NUMERIC(5, 2) DEFAULT 0,
                lop_days NUMERIC(5, 2) DEFAULT 0,
                base_salary NUMERIC(12, 2) DEFAULT 0,
                hra NUMERIC(12, 2) DEFAULT 0,
                allowances NUMERIC(12, 2) DEFAULT 0,
                gross_pay NUMERIC(12, 2) DEFAULT 0,
                lop_deduction NUMERIC(12, 2) DEFAULT 0,
                pf_deduction NUMERIC(12, 2) DEFAULT 0,
                tax_deduction NUMERIC(12, 2) DEFAULT 0,
                net_pay NUMERIC(12, 2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Generated',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 8. Face Embeddings (Persistent Biometrics)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS FaceEmbeddings (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                encodings_data BYTEA NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_name)
            );
        """)

        conn.commit()
        logger.info("PostgreSQL schema initialized successfully.")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error initializing PostgreSQL schema: {e}")
    finally:
        conn.close()


def fetch_user_by_username(username):
    """
    Fetch tenant company data from PostgreSQL by username or email.
    Supports case-insensitive matching and whitespace trimming.
    """
    if not username:
        return None
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            clean_name = username.strip()
            cursor.execute(
                'SELECT * FROM Companies WHERE LOWER(TRIM(Username)) = LOWER(%s) OR LOWER(TRIM("Email")) = LOWER(%s) LIMIT 1',
                (clean_name, clean_name)
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
        except Exception as e:
            logger.error(f"Error fetching user {username} from PostgreSQL: {e}")
        finally:
            conn.close()
    return None


def fetch_company_users(company_id):
    """
    Fetch all enrolled users for a given company from PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT "User Name" AS Name FROM Users WHERE "Company ID" = %s ORDER BY "User Name" ASC', (company_id,))
            rows = cursor.fetchall()
            return [{'name': r['name']} for r in rows]
        except Exception as e:
            logger.error(f"Error fetching users for {company_id}: {e}")
        finally:
            conn.close()
    return []


def delete_user_from_company(company_id, username):
    """
    Delete a user from the company across Users, AttendanceRecords, Leaves, SalaryStructures, and FaceEmbeddings.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM Users WHERE "Company ID" = %s AND "User Name" = %s', (company_id, username))
            cursor.execute('DELETE FROM AttendanceRecords WHERE company_id = %s AND user_name = %s', (company_id, username))
            cursor.execute('DELETE FROM Leaves WHERE "Company ID" = %s AND "User Name" = %s', (company_id, username))
            cursor.execute('DELETE FROM SalaryStructures WHERE company_id = %s AND user_name = %s', (company_id, username))
            cursor.execute('DELETE FROM FaceEmbeddings WHERE company_id = %s AND user_name = %s', (company_id, username))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error deleting user {username} from {company_id}: {e}")
        finally:
            conn.close()
    return False


def read_attendance_from_db(company_id):
    """
    Reads attendance rows from PostgreSQL AttendanceRecords table.
    Returns: list of [user_name, date, in_time, out_time, status, expected_checkout, hours, day_status]
    """
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_name, date, in_time, out_time, status, expected_checkout, hours, day_status
            FROM AttendanceRecords
            WHERE company_id = %s
            ORDER BY date DESC, user_name ASC
        """, (company_id,))
        rows = cursor.fetchall()
        attendance = []
        for r in rows:
            attendance.append([
                r['user_name'],
                r['date'],
                r['in_time'] or '',
                r['out_time'] or '',
                r['status'] or 'Absent',
                r['expected_checkout'] or '',
                r['hours'] or '0',
                r['day_status'] or 'Absent'
            ])
        return attendance
    except Exception as e:
        logger.error(f"Error reading attendance for {company_id} from PostgreSQL: {e}")
        return []
    finally:
        conn.close()


def upsert_attendance_record(company_id, user_name, date_str, in_time='', out_time='', status='Absent', expected_checkout='', hours='0', day_status='Absent'):
    """
    Upserts an attendance record atomically in PostgreSQL.
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO AttendanceRecords (company_id, user_name, date, in_time, out_time, status, expected_checkout, hours, day_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, user_name, date) DO UPDATE SET
                in_time = CASE WHEN EXCLUDED.in_time != '' THEN EXCLUDED.in_time ELSE AttendanceRecords.in_time END,
                out_time = CASE WHEN EXCLUDED.out_time != '' THEN EXCLUDED.out_time ELSE AttendanceRecords.out_time END,
                status = EXCLUDED.status,
                expected_checkout = CASE WHEN EXCLUDED.expected_checkout != '' THEN EXCLUDED.expected_checkout ELSE AttendanceRecords.expected_checkout END,
                hours = CASE WHEN EXCLUDED.hours != '0' AND EXCLUDED.hours != '' THEN EXCLUDED.hours ELSE AttendanceRecords.hours END,
                day_status = EXCLUDED.day_status;
        """, (company_id, user_name, date_str, in_time, out_time, status, expected_checkout, hours, day_status))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"Error upserting attendance record: {e}")
        return False
    finally:
        conn.close()


def get_salary_structure(company_id, user_name):
    """
    Get configured salary structure for an employee from PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT base_salary, hra, allowances, pf_enabled, tax_rate,
                       conveyance_allowance, special_allowance, pf_rate, bank_name, account_number, ifsc_code, payment_mode
                FROM SalaryStructures
                WHERE company_id = %s AND user_name = %s
            """, (company_id, user_name))
            row = cursor.fetchone()
            if row:
                return dict(row)
        except Exception as e:
            logger.error(f"Error fetching salary structure: {e}")
        finally:
            conn.close()
    return {
        'base_salary': 25000.0,
        'hra': 5000.0,
        'allowances': 2000.0,
        'pf_enabled': 1,
        'tax_rate': 5.0,
        'conveyance_allowance': 0.0,
        'special_allowance': 0.0,
        'pf_rate': 12.0,
        'bank_name': '',
        'account_number': '',
        'ifsc_code': '',
        'payment_mode': 'Bank Transfer'
    }


def upsert_salary_structure(company_id, user_name, base_salary, hra=5000.0, allowances=2000.0, pf_enabled=1, tax_rate=5.0):
    """
    Save or update an employee's salary configuration in PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO SalaryStructures (company_id, user_name, base_salary, hra, allowances, pf_enabled, tax_rate)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, user_name) DO UPDATE SET
                    base_salary = EXCLUDED.base_salary,
                    hra = EXCLUDED.hra,
                    allowances = EXCLUDED.allowances,
                    pf_enabled = EXCLUDED.pf_enabled,
                    tax_rate = EXCLUDED.tax_rate;
            """, (company_id, user_name, float(base_salary), float(hra), float(allowances), int(pf_enabled), float(tax_rate)))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving salary structure: {e}")
        finally:
            conn.close()
    return False


def get_all_salary_structures(company_id):
    """
    Return all configured salary structures for a company from PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_name, base_salary, hra, allowances, pf_enabled, tax_rate
                FROM SalaryStructures
                WHERE company_id = %s
            """, (company_id,))
            rows = cursor.fetchall()
            return {r['user_name']: dict(r) for r in rows}
        except Exception as e:
            logger.error(f"Error fetching all salary structures: {e}")
        finally:
            conn.close()
    return {}


def save_payroll_run(company_id, month, year, run_data, payslips_data):
    """
    Saves a completed monthly payroll run batch and associated payslips atomically in PostgreSQL.
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO PayrollRuns (company_id, month, year, total_employees, total_gross, total_deductions, total_net, status, working_days, processed_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, month, year) DO UPDATE SET
                total_employees = EXCLUDED.total_employees,
                total_gross = EXCLUDED.total_gross,
                total_deductions = EXCLUDED.total_deductions,
                total_net = EXCLUDED.total_net,
                status = EXCLUDED.status,
                working_days = EXCLUDED.working_days,
                processed_at = CURRENT_TIMESTAMP
            RETURNING id;
        """, (
            company_id, int(month), int(year),
            run_data.get('total_employees', 0),
            run_data.get('total_gross', 0.0),
            run_data.get('total_deductions', 0.0),
            run_data.get('total_net', 0.0),
            run_data.get('status', 'Completed'),
            run_data.get('working_days', 26),
            run_data.get('processed_by', 'Admin')
        ))
        res = cursor.fetchone()
        run_id = res['id'] if res else None

        if not run_id:
            cursor.execute("SELECT id FROM PayrollRuns WHERE company_id = %s AND month = %s AND year = %s", (company_id, int(month), int(year)))
            run_id = cursor.fetchone()['id']

        # Clear previous payslips for this run if re-calculating
        cursor.execute("DELETE FROM Payslips WHERE payroll_run_id = %s", (run_id,))

        for ps in payslips_data:
            cursor.execute("""
                INSERT INTO Payslips (
                    payroll_run_id, company_id, user_name, month, year, working_days,
                    present_days, half_days, absent_days, paid_leave_days, lop_days,
                    base_salary, hra, allowances, gross_pay, lop_deduction, pf_deduction, tax_deduction, net_pay, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                run_id, company_id, ps['user_name'], int(month), int(year), ps.get('working_days', 26),
                ps.get('present_days', 0), ps.get('half_days', 0), ps.get('absent_days', 0),
                ps.get('paid_leave_days', 0), ps.get('lop_days', 0),
                ps.get('base_salary', 0), ps.get('hra', 0), ps.get('allowances', 0),
                ps.get('gross_pay', 0), ps.get('lop_deduction', 0), ps.get('pf_deduction', 0),
                ps.get('tax_deduction', 0), ps.get('net_pay', 0), ps.get('status', 'Generated')
            ))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving payroll run to PostgreSQL: {e}")
        return False
    finally:
        conn.close()


def get_payroll_runs(company_id):
    """
    Get all historical payroll runs for a tenant from PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, company_id, month, year, total_employees, total_gross, total_deductions, total_net, status, processed_at
                FROM PayrollRuns
                WHERE company_id = %s
                ORDER BY year DESC, month DESC
            """, (company_id,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching payroll runs: {e}")
        finally:
            conn.close()
    return []


def get_payslips_for_run(company_id, run_id):
    """
    Get all payslips associated with a specific payroll run from PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM Payslips
                WHERE company_id = %s AND payroll_run_id = %s
                ORDER BY user_name ASC
            """, (company_id, run_id))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching payslips for run {run_id}: {e}")
        finally:
            conn.close()
    return []
