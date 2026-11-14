# # app/utils/db_utils.py

# import sqlite3
# import logging

# # Adjust this path as needed
# DB_PATH = "sqlite_exports/attendance_data.db"

# # Set up logging
# logger = logging.getLogger(__name__)

# def get_db_connection():
#     """
#     Create and return a connection to the SQLite database.
#     """
#     try:
#         conn = sqlite3.connect(DB_PATH)
#         conn.row_factory = sqlite3.Row  # Access columns by name
#         return conn
#     except sqlite3.Error as e:
#         logger.error(f"Error connecting to the database: {e}")
#         return None

# def fetch_user_by_username(username):
#     """
#     Fetch user data from the database by username.
#     Returns the user data or None if not found.
#     """
#     conn = get_db_connection()
#     if conn:
#         try:
#             cursor = conn.cursor()
#             cursor.execute("SELECT * FROM Companies WHERE username = ?", (username,))
#             user_data = cursor.fetchone()
#             conn.close()
#             return user_data
#         except sqlite3.Error as e:
#             logger.error(f"Error querying the users table: {e}")
#             conn.close()
#             return None
#     return None

# def fetch_company_users(company_id):
#     """
#     Fetch all records from the company-specific table based on company_id.
#     """
#     # Sanitize company_id by replacing spaces with underscores
#     company_id = company_id.replace(" ", "_")  # Ensure no spaces in table name

#     # Dynamically create the table name based on company_id
#     table_name = company_id  # e.g., 'CRYPTO_FORENSIC_TECHNOLOGY_01'

#     # Dynamically create the SQL query
#     query = f"SELECT * FROM `{table_name}` LIMIT 30"

#     # Connect to the database
#     conn = get_db_connection()
#     if conn:
#         try:
#             cursor = conn.cursor()

#             # Execute the dynamic query
#             cursor.execute(query)
#             rows = cursor.fetchall()
            
#             company_data = [dict(row) for row in rows]
#             # Process the data if necessary
#             conn.close()
#             return company_data  # Return the fetched rows

#         except sqlite3.Error as e:
#             logger.error(f"Error querying table {table_name}: {e}")
#             conn.close()
#             return []
#     return []


# app/utils/db_utils.py

import os
import sqlite3
import logging

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB_PATH = os.environ.get('DB_PATH') or os.path.join(BASE_DIR, "sqlite_exports", "attendance_data.db")
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

# In serverless environments (like Vercel), the filesystem outside of /tmp is read-only.
# Copy database to /tmp so read/write queries succeed without permission errors.
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
        logging.getLogger(__name__).warning(f"Could not copy database to /tmp: {e}")

# Set up logging
logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Create and return a connection to the SQLite database.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Access columns by name
        return conn
    except sqlite3.Error as e:
        logger.error(f"Error connecting to the database: {e}")
        return None

def init_db_schema():
    """
    Ensures all necessary tables and columns exist in the SQLite database.
    """
    conn = get_db_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        
        # Ensure Companies table exists
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
        
        # Check existing columns in Companies and add any missing ones
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

        # Ensure Users table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                "Company ID" TEXT,
                "User Name" TEXT
            )
        """)

        # Ensure Leaves table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Leaves (
                "Company ID" TEXT,
                "User Name" TEXT,
                "Year-Month" TEXT,
                "Leaves Allowed" INTEGER DEFAULT 2,
                "Leaves Taken" INTEGER DEFAULT 0,
                "Leaves Carried" INTEGER DEFAULT 0
            )
        """)
        
        conn.commit()
    except Exception as e:
        logger.error(f"Error initializing DB schema: {e}")
    finally:
        conn.close()


def fetch_user_by_username(username):
    """
    Fetch user data from the database by username or email.
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
            conn.close()
            return user_data
        except sqlite3.Error as e:
            logger.error(f"Error querying the users table: {e}")
            conn.close()
            return None
    return None

def fetch_company_users(company_id):
    """
    Fetch all records from the company-specific table based on company_id.
    """
    # Sanitize company_id by replacing spaces with underscores
    company_id = company_id.replace(" ", "_")  # Ensure no spaces in table name

    # Dynamically create the table name based on company_id
    table_name = company_id  # e.g., 'CRYPTO_FORENSIC_TECHNOLOGY_01'

    # Connect to the database
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 30")
            rows = cursor.fetchall()
            
            company_data = [dict(row) for row in rows]
            conn.close()
            return company_data  # Return the fetched rows
        except sqlite3.OperationalError as e:
            if "no such table" in str(e).lower():
                logger.warning(f"Table {table_name} not found. Creating a new table.")
                try:
                    cursor.execute(f"""
                        CREATE TABLE IF NOT EXISTS `{table_name}` (
                            Name TEXT,
                            )
                    """)
                    conn.commit()
                    conn.close()
                    return []  # Table just created, so no data to return
                except sqlite3.Error as ce:
                    logger.error(f"Failed to create table {table_name}: {ce}")
                    conn.close()
                    return []
            else:
                logger.error(f"Database error querying table {table_name}: {e}")
                conn.close()
                return []
    return []

def read_attendance_from_db(company_id):
    """
    Fetch attendance records for a specific company from its corresponding table.
    """
    company_id = company_id.replace(" ", "_")  # Sanitize the company_id for SQL safety
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM `{company_id}`")  # Table name is company_id
            attendance = cursor.fetchall()
            conn.close()
            return attendance
        except sqlite3.Error as e:
            logger.error(f"Error fetching attendance data for {company_id}: {e}")
            conn.close()
            return []
    return []

def get_attendance_for_company(company_id, month, year):
    """
    Fetch attendance records for a specific company for a specific month and year.
    """
    company_id = company_id.replace(" ", "_")
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT * FROM `{company_id}`
                WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
            """, (month, year))
            attendance = cursor.fetchall()
            conn.close()
            return attendance
        except sqlite3.Error as e:
            logger.error(f"Error fetching attendance data for {company_id} in {month}/{year}: {e}")
            conn.close()
            return []
    return []





def fetch_user_by_name_from_company_table(company_id, username):
    """
    Fetch user data from the company-specific table by username.
    Returns the user data or None if not found.
    """
    conn = get_db_connection()
    if conn:
        try:
            # Sanitize company_id by replacing spaces with underscores
            company_id = company_id.replace(" ", "_")
            table_name = company_id

            cursor = conn.cursor()
            cursor.execute(f'SELECT * FROM `{table_name}` WHERE "Name" = ?', (username,))
            user_data = cursor.fetchone()
            conn.close()
            return user_data
        except sqlite3.Error as e:
            logger.error(f"Error querying the company-specific table for {company_id}: {e}")
            conn.close()
            return None
    return None

def delete_user_from_company_table(company_id, username):
    """
    Delete a user from the company-specific table.
    """
    conn = get_db_connection()
    if conn:
        try:
            company_id = company_id.replace(" ", "_")  # Sanitize company_id for table name
            table_name = company_id

            cursor = conn.cursor()
            cursor.execute(f"DELETE FROM `{table_name}` WHERE Name = ?", (username,))
            cursor.execute('DELETE FROM Users WHERE "Company ID" = ? AND "User Name" = ?', (company_id, username))
            conn.commit()
            conn.close()
            logger.info(f"User {username} deleted from company table {table_name}.")
            return True
        except sqlite3.Error as e:
            logger.error(f"Error deleting user {username} from company table {company_id}: {e}")
            conn.close()
            return False
    return False

