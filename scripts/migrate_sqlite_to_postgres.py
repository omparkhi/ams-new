"""
Migration script: SQLite to PostgreSQL for Attendify SaaS.
Copies all data from attendance_data.db and face encoding .pkl files into PostgreSQL.
"""

import os
import sys
import sqlite3
import psycopg2
import pickle
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SQLITE_DB = os.path.join(BASE_DIR, 'sqlite_exports', 'attendance_data.db')
ENCODINGS_DIR = os.path.join(BASE_DIR, 'app', 'encodings')

PG_URL = os.environ.get('DATABASE_URL') or 'postgresql://postgres:root@localhost:5432/attendify_db'

def run_migration():
    logger.info(f"Source SQLite DB: {SQLITE_DB}")
    logger.info(f"Target PostgreSQL: {PG_URL.split('@')[-1]}")

    if not os.path.exists(SQLITE_DB):
        logger.error(f"SQLite DB not found at {SQLITE_DB}")
        sys.exit(1)

    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    pg_conn = psycopg2.connect(PG_URL)
    pg_conn.autocommit = False
    pg_cur = pg_conn.cursor()

    try:
        logger.info("1. Creating PostgreSQL schemas...")

        # Companies
        pg_cur.execute("""
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

        # Users
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                "Company ID" VARCHAR(100) NOT NULL REFERENCES Companies("Company ID") ON DELETE CASCADE,
                "User Name" VARCHAR(150) NOT NULL,
                UNIQUE("Company ID", "User Name")
            );
        """)

        # Leaves
        pg_cur.execute("""
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

        # AttendanceRecords
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS AttendanceRecords (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                date VARCHAR(20) NOT NULL,
                in_time VARCHAR(20),
                out_time VARCHAR(20),
                status VARCHAR(50),
                expected_checkout VARCHAR(20),
                hours VARCHAR(20),
                day_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_name, date)
            );
        """)

        # SalaryStructures
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS SalaryStructures (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                base_salary NUMERIC(12, 2) DEFAULT 25000.0,
                hra NUMERIC(12, 2) DEFAULT 0.0,
                allowances NUMERIC(12, 2) DEFAULT 0.0,
                pf_enabled INTEGER DEFAULT 1,
                tax_rate NUMERIC(5, 2) DEFAULT 0.0,
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

        # PayrollRuns
        pg_cur.execute("""
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

        # Payslips
        pg_cur.execute("""
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

        # FaceEmbeddings (Persistent Biometrics)
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS FaceEmbeddings (
                id SERIAL PRIMARY KEY,
                company_id VARCHAR(100) NOT NULL,
                user_name VARCHAR(150) NOT NULL,
                encodings_data BYTEA NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_name)
            );
        """)

        logger.info("2. Migrating Companies...")
        sqlite_cur.execute('SELECT * FROM Companies')
        companies = sqlite_cur.fetchall()
        for c in companies:
            pg_cur.execute("""
                INSERT INTO Companies ("Company ID", "Company Name", "Username", "Password", "Leaves Per Month", "Address", "Contact", "Email", "Check In Time", "Check Out Time", "Required Hours", "Currency")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("Company ID") DO UPDATE SET
                    "Company Name" = EXCLUDED."Company Name",
                    "Username" = EXCLUDED."Username",
                    "Password" = EXCLUDED."Password",
                    "Check In Time" = EXCLUDED."Check In Time",
                    "Check Out Time" = EXCLUDED."Check Out Time",
                    "Required Hours" = EXCLUDED."Required Hours";
            """, (
                c['Company ID'], c['Company Name'], c['Username'], c['Password'],
                c['Leaves Per Month'], c['Address'], c['Contact'], c['Email'],
                c['Check In Time'], c['Check Out Time'], c['Required Hours'], c['Currency']
            ))
        logger.info(f"   ✓ Migrated {len(companies)} companies.")

        logger.info("3. Migrating Users...")
        sqlite_cur.execute('SELECT * FROM Users')
        users = sqlite_cur.fetchall()
        for u in users:
            pg_cur.execute("""
                INSERT INTO Users ("Company ID", "User Name")
                VALUES (%s, %s)
                ON CONFLICT ("Company ID", "User Name") DO NOTHING;
            """, (u['Company ID'], u['User Name']))
        logger.info(f"   ✓ Migrated {len(users)} users.")

        logger.info("4. Migrating AttendanceRecords...")
        sqlite_cur.execute('SELECT * FROM AttendanceRecords')
        attendance = sqlite_cur.fetchall()
        for a in attendance:
            pg_cur.execute("""
                INSERT INTO AttendanceRecords (company_id, user_name, date, in_time, out_time, status, expected_checkout, hours, day_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, user_name, date) DO UPDATE SET
                    in_time = EXCLUDED.in_time,
                    out_time = EXCLUDED.out_time,
                    status = EXCLUDED.status,
                    expected_checkout = EXCLUDED.expected_checkout,
                    hours = EXCLUDED.hours,
                    day_status = EXCLUDED.day_status;
            """, (
                a['company_id'], a['user_name'], a['date'], a['in_time'],
                a['out_time'], a['status'], a['expected_checkout'], a['hours'], a['day_status']
            ))
        logger.info(f"   ✓ Migrated {len(attendance)} attendance records.")

        logger.info("5. Migrating Leaves...")
        sqlite_cur.execute('SELECT * FROM Leaves')
        leaves = sqlite_cur.fetchall()
        for l in leaves:
            pg_cur.execute("""
                INSERT INTO Leaves ("Company ID", "User Name", "Year-Month", "Leaves Allowed", "Leaves Taken", "Leaves Carried")
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT ("Company ID", "User Name", "Year-Month") DO NOTHING;
            """, (l['Company ID'], l['User Name'], l['Year-Month'], l['Leaves Allowed'], l['Leaves Taken'], l['Leaves Carried']))
        logger.info(f"   ✓ Migrated {len(leaves)} leaves.")

        logger.info("6. Migrating SalaryStructures...")
        sqlite_cur.execute('SELECT * FROM SalaryStructures')
        salaries = sqlite_cur.fetchall()
        for s in salaries:
            pg_cur.execute("""
                INSERT INTO SalaryStructures (company_id, user_name, base_salary, hra, allowances, pf_enabled, tax_rate)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, user_name) DO UPDATE SET
                    base_salary = EXCLUDED.base_salary;
            """, (s['company_id'], s['user_name'], s['base_salary'], s['hra'], s['allowances'], s['pf_enabled'], s['tax_rate']))
        logger.info(f"   ✓ Migrated {len(salaries)} salary structures.")

        logger.info("7. Migrating PayrollRuns & Payslips...")
        sqlite_cur.execute('SELECT * FROM PayrollRuns')
        runs = sqlite_cur.fetchall()
        for r in runs:
            pg_cur.execute("""
                INSERT INTO PayrollRuns (company_id, month, year, total_employees, total_gross, total_deductions, total_net, status, working_days)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, month, year) DO NOTHING
                RETURNING id;
            """, (
                r['company_id'], r['month'], r['year'], r['total_employees'],
                r['total_gross'], r['total_deductions'], r['total_net'], r['status'], r['working_days']
            ))
            res = pg_cur.fetchone()
            new_run_id = res[0] if res else None

            if new_run_id:
                sqlite_cur.execute('SELECT * FROM Payslips WHERE payroll_run_id = ?', (r['id'],))
                slips = sqlite_cur.fetchall()
                for slip in slips:
                    pg_cur.execute("""
                        INSERT INTO Payslips (
                            payroll_run_id, company_id, user_name, month, year, working_days,
                            present_days, half_days, absent_days, paid_leave_days, lop_days,
                            base_salary, hra, allowances, gross_pay, lop_deduction, pf_deduction,
                            tax_deduction, net_pay, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, (
                        new_run_id, slip['company_id'], slip['user_name'], slip['month'], slip['year'],
                        slip['working_days'], slip['present_days'], slip['half_days'], slip['absent_days'],
                        slip['paid_leave_days'], slip['lop_days'], slip['base_salary'], slip['hra'],
                        slip['allowances'], slip['gross_pay'], slip['lop_deduction'], slip['pf_deduction'],
                        slip['tax_deduction'], slip['net_pay'], slip['status']
                    ))
        logger.info(f"   ✓ Migrated {len(runs)} payroll runs and associated payslips.")

        logger.info("8. Migrating Biometric Face Encodings (.pkl to FaceEmbeddings)...")
        if os.path.exists(ENCODINGS_DIR):
            pkl_count = 0
            for fname in os.listdir(ENCODINGS_DIR):
                if fname.startswith('face_encodings_') and fname.endswith('.pkl'):
                    company_id = fname.replace('face_encodings_', '').replace('.pkl', '')
                    fpath = os.path.join(ENCODINGS_DIR, fname)
                    try:
                        with open(fpath, 'rb') as f:
                            data = pickle.load(f)
                        if isinstance(data, dict):
                            for uname, enc_list in data.items():
                                byte_data = pickle.dumps(enc_list)
                                pg_cur.execute("""
                                    INSERT INTO FaceEmbeddings (company_id, user_name, encodings_data)
                                    VALUES (%s, %s, %s)
                                    ON CONFLICT (company_id, user_name) DO UPDATE SET
                                        encodings_data = EXCLUDED.encodings_data,
                                        updated_at = CURRENT_TIMESTAMP;
                                """, (company_id, uname, psycopg2.Binary(byte_data)))
                                pkl_count += 1
                    except Exception as ex:
                        logger.warning(f"Could not load {fname}: {ex}")
            logger.info(f"   ✓ Migrated {pkl_count} face vector embeddings into PostgreSQL.")

        pg_conn.commit()
        logger.info("==================================================")
        logger.info("🎉 SUCCESS! SQLite database fully migrated to PostgreSQL!")
        logger.info("==================================================")

    except Exception as e:
        pg_conn.rollback()
        logger.error(f"Migration failed! Rolled back transaction. Error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == '__main__':
    run_migration()
