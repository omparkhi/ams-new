"""
Script to copy all data from local PostgreSQL to Remote Render PostgreSQL Database.
Usage:
    python scripts/migrate_to_remote_db.py "postgresql://user:password@hostname/dbname"
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.utils.db_utils import init_db_schema

LOCAL_DB_URL = os.environ.get('LOCAL_DATABASE_URL') or 'postgresql://postgres:root@localhost:5432/attendify_db'

TABLES = [
    'Companies',
    'Users',
    'AttendanceRecords',
    'Leaves',
    'SalaryStructures',
    'PayrollRuns',
    'Payslips',
    'FaceEmbeddings'
]

def migrate(remote_url):
    if not remote_url:
        print("Error: Please provide your remote Render DATABASE_URL as an argument.")
        print("Example: python scripts/migrate_to_remote_db.py \"postgresql://user:pass@dpg-xxxx.oregon-postgres.render.com/attendify_db\"")
        return

    if remote_url.startswith('postgres://'):
        remote_url = remote_url.replace('postgres://', 'postgresql://', 1)

    print(f"Connecting to Local DB: {LOCAL_DB_URL.split('@')[-1]}...")
    local_conn = psycopg2.connect(LOCAL_DB_URL, cursor_factory=RealDictCursor)

    print(f"Connecting to Remote Render DB: {remote_url.split('@')[-1]}...")
    remote_conn = psycopg2.connect(remote_url, cursor_factory=RealDictCursor)

    # Initialize schema on remote DB first
    print("\nEnsuring remote schema is initialized...")
    os.environ['DATABASE_URL'] = remote_url
    init_db_schema()

    local_cur = local_conn.cursor()
    remote_cur = remote_conn.cursor()

    for table in TABLES:
        try:
            local_cur.execute(f'SELECT * FROM "{table}";' if table in ['Companies', 'Users', 'Leaves'] else f'SELECT * FROM {table};')
            rows = local_cur.fetchall()
            if not rows:
                print(f"Table '{table}': 0 rows (skipped)")
                continue

            cols = list(rows[0].keys())
            col_names = ', '.join([f'"{c}"' for c in cols])
            placeholders = ', '.join(['%s'] * len(cols))

            query = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;' if table in ['Companies', 'Users', 'Leaves'] else f'INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'

            for r in rows:
                vals = [r[c] for c in cols]
                remote_cur.execute(query, vals)

            remote_conn.commit()
            print(f"Migrated {len(rows)} records into '{table}' successfully.")
        except Exception as e:
            remote_conn.rollback()
            print(f"Error copying table {table}: {e}")

    local_conn.close()
    remote_conn.close()
    print("\nRemote database migration completed successfully!")

if __name__ == '__main__':
    remote = sys.argv[1] if len(sys.argv) > 1 else None
    migrate(remote)
