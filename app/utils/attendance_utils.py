"""
attendance_utils.py - High-Performance Normalized Attendance Utilities for Attendify (AMS).
Operates directly on the normalized `AttendanceRecords` table.
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta, time, date, timezone
from calendar import monthrange
from functools import lru_cache
from app.utils.db_utils import get_db_connection

logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB_PATH = os.environ.get('DB_PATH') or os.path.join(BASE_DIR, "sqlite_exports", "attendance_data.db")

INDIA_OFFSET = timedelta(hours=5, minutes=30)
india_offset = INDIA_OFFSET  # backwards compatibility

def get_ist_now():
    """
    Returns naive datetime in India Standard Time (UTC+5:30)
    regardless of server's local OS timezone (fixes double-offset issue and offset-naive vs offset-aware conflicts).
    """
    return (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).replace(tzinfo=None)

if os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
    TEMP_CHECKIN_IMAGES_DIR = "/tmp/temp_checkin_images"
else:
    TEMP_CHECKIN_IMAGES_DIR = os.path.join(BASE_DIR, "temp_checkin_images")

os.makedirs(TEMP_CHECKIN_IMAGES_DIR, exist_ok=True)


def parse_time_range(time_range):
    """
    Parse time range string 'HH:MM:SS - HH:MM:SS' into (in_time, out_time).
    """
    try:
        parts = time_range.split(" - ")
        in_time = parts[0].strip() if len(parts) > 0 else ''
        out_time = parts[1].strip() if len(parts) > 1 else ''
        return in_time, out_time
    except Exception:
        return '', ''


def calculate_hours(in_time, out_time):
    """
    Calculate hours worked between check-in and check-out timestamps.
    """
    if not in_time or not out_time:
        return ''
    try:
        t1 = datetime.strptime(in_time, '%H:%M:%S')
        t2 = datetime.strptime(out_time, '%H:%M:%S')
        diff = (t2 - t1).total_seconds()
        if diff < 0:
            diff += 86400
        return f"{diff / 3600:.2f}"
    except Exception:
        return ''


def read_attendance_from_db(company_id):
    """
    Reads all attendance records for a company from the normalized `AttendanceRecords` table.
    Returns: List of [user_name, date, in_time, out_time, status, expected_checkout, hours, day_status]
    """
    clean_id = company_id.replace(" ", "_")
    attendance = []

    try:
        conn = get_db_connection()
        if not conn:
            return []
        cursor = conn.cursor()

        # 1. Primary Query: Normalized AttendanceRecords Table
        cursor.execute("""
            SELECT user_name, date, in_time, out_time, status, expected_checkout, hours, day_status
            FROM AttendanceRecords
            WHERE company_id = ? OR company_id = ?
            ORDER BY date DESC, user_name ASC
        """, (company_id, clean_id))
        rows = cursor.fetchall()

        if rows:
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
            conn.close()
            return attendance

        # 2. Fallback for legacy tables if any
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (clean_id,))
        if cursor.fetchone():
            cursor.execute(f"SELECT * FROM '{clean_id}'")
            legacy_rows = cursor.fetchall()
            if legacy_rows:
                columns = [desc[0] for desc in cursor.description]
                for row in legacy_rows:
                    row_dict = dict(row)
                    name = row_dict.get('Name') or row[0]
                    for i in range(1, len(columns), 4):
                        if i + 3 >= len(columns):
                            break
                        d = columns[i].replace(' Attendance', '')
                        tr = row_dict.get(columns[i], '')
                        exp = row_dict.get(columns[i + 1], '')
                        hrs = row_dict.get(columns[i + 2], '')
                        ds = row_dict.get(columns[i + 3], '')
                        if tr:
                            it, ot = parse_time_range(tr)
                            st = 'Present' if it else 'Absent'
                            attendance.append([name, d, it, ot, st, exp, hrs, ds])
                            # Auto-migrate legacy row to AttendanceRecords
                            try:
                                cursor.execute("""
                                    INSERT OR REPLACE INTO AttendanceRecords
                                    (company_id, user_name, date, in_time, out_time, status, expected_checkout, hours, day_status)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (clean_id, name, d, it, ot, st, exp, hrs, ds))
                            except Exception:
                                pass
                conn.commit()

        conn.close()
        return attendance

    except Exception as e:
        logger.error(f"Error in read_attendance_from_db for {company_id}: {e}")
        return []


def update_attendance_in_db(company_id, attendance):
    """
    Saves or updates attendance records in the normalized `AttendanceRecords` table.
    `attendance` is a list of [user_name, date, in_time, out_time, status, expected_checkout, hours, day_status].
    """
    clean_id = company_id.replace(" ", "_")
    try:
        conn = get_db_connection()
        if not conn:
            return
        cursor = conn.cursor()

        for rec in attendance:
            if not rec or len(rec) < 2:
                continue
            name = rec[0]
            d = rec[1]
            it = rec[2] if len(rec) > 2 else ''
            ot = rec[3] if len(rec) > 3 else ''
            st = rec[4] if len(rec) > 4 else ('Present' if it else 'Absent')
            exp = rec[5] if len(rec) > 5 else ''
            hrs = rec[6] if len(rec) > 6 else ''
            ds = rec[7] if len(rec) > 7 else 'Full Day'

            if it and ot and not hrs:
                hrs = calculate_hours(it, ot)

            cursor.execute("""
                INSERT INTO AttendanceRecords
                (company_id, user_name, date, in_time, out_time, status, expected_checkout, hours, day_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(company_id, user_name, date) DO UPDATE SET
                    in_time = excluded.in_time,
                    out_time = excluded.out_time,
                    status = excluded.status,
                    expected_checkout = excluded.expected_checkout,
                    hours = excluded.hours,
                    day_status = excluded.day_status
            """, (clean_id, name, d, it, ot, st, exp, hrs, ds))

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error in update_attendance_in_db for {company_id}: {e}")


def log_attendance(company_id, name, action):
    """
    Logs attendance check-in or check-out for an employee in the normalized AttendanceRecords.
    Uses true India Standard Time (UTC+5:30) and organization shift settings.
    """
    now = get_ist_now()
    date_str = now.strftime('%d/%m/%Y')
    time_str = now.strftime('%H:%M:%S')

    # Fetch company shift settings (default to 09:00:00 / 18:00:00 if not set)
    checkin_target = '09:00:00'
    checkout_target = '18:00:00'
    req_hours = 8.0
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute('SELECT "Check In Time", "Check Out Time", "Required Hours" FROM Companies WHERE "Company ID" = ?', (company_id,))
            c_row = cursor.fetchone()
            if c_row:
                checkin_target = c_row['Check In Time'] or '09:00:00'
                checkout_target = c_row['Check Out Time'] or '18:00:00'
                try:
                    req_hours = float(c_row['Required Hours'] or 8.0)
                except ValueError:
                    req_hours = 8.0
            conn.close()
    except Exception as e:
        logger.warning(f"Could not load shift settings for {company_id}: {e}")

    attendance = read_attendance_from_db(company_id)
    today_records = [r for r in attendance if r[0] == name and r[1] == date_str]

    def determine_checkout_and_status(checkin_time_str):
        try:
            target_dt = datetime.strptime(checkin_target, '%H:%M:%S').time()
            actual_dt = datetime.strptime(checkin_time_str, '%H:%M:%S').time()

            # Up to 60 minutes after shift start is considered Full Day, otherwise Half Day
            shift_start_combined = datetime.combine(now.date(), target_dt)
            grace_limit = (shift_start_combined + timedelta(minutes=60)).time()

            if actual_dt <= grace_limit:
                return checkout_target, 'Full Day'
            else:
                return checkout_target, 'Half Day'
        except Exception:
            return checkout_target, 'Full Day'

    if not today_records:
        if action == 'checkin':
            expected_checkout, day_status = determine_checkout_and_status(time_str)
            attendance.append([name, date_str, time_str, '', 'Present', expected_checkout, '', day_status])
            update_attendance_in_db(company_id, attendance)
            return True, expected_checkout, day_status
    else:
        last = today_records[-1]
        if action == 'checkout' and last[2] and not last[3]:
            last[3] = time_str
            last[6] = calculate_hours(last[2], time_str)
            try:
                hrs_float = float(last[6]) if last[6] else 0.0
                if hrs_float >= req_hours * 0.75:
                    last[7] = 'Full Day'
                else:
                    last[7] = 'Half Day'
            except (ValueError, TypeError):
                pass
            update_attendance_in_db(company_id, attendance)
            return True, last[6], last[7]
        elif action == 'checkin' and not last[2]:
            last[2] = time_str
            last[5], last[7] = determine_checkout_and_status(time_str)
            update_attendance_in_db(company_id, attendance)
            return True, last[5], last[7]

    return False, '', last[7] if today_records else 'Full Day'


@lru_cache(maxsize=128)
def get_checkin_image_base64(company_id, name, date_str):
    path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{name}_{date_str.replace('/', '-')}.jpg")
    if os.path.exists(path):
        with open(path, "rb") as f:
            import base64
            return f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"
    return None


def get_company_times_from_db(company_id):
    try:
        conn = get_db_connection()
        if not conn:
            return None, None, None
        cursor = conn.cursor()
        cursor.execute('SELECT "Check In Time", "Check Out Time", "Required Hours" FROM Companies WHERE "Company ID" = ?', (company_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            ci = row['Check In Time']
            co = row['Check Out Time']
            rh = row['Required Hours']
            return ci, co, float(rh) if rh else None
    except Exception as e:
        logger.error(f"Error in get_company_times_from_db: {e}")
    return None, None, None


def calculate_working_days(year, month):
    """
    Calculates working days excluding Sundays and 2nd/4th Saturdays.
    """
    working_days = []
    saturday_count = 0

    for day in range(1, monthrange(year, month)[1] + 1):
        current_date = datetime(year, month, day)
        weekday = current_date.weekday()

        if weekday < 5:  # Monday to Friday
            working_days.append(current_date.strftime('%d/%m/%Y'))
        elif weekday == 5:  # Saturday
            saturday_count += 1
            if saturday_count not in [2, 4]:  # Exclude 2nd & 4th Saturday
                working_days.append(current_date.strftime('%d/%m/%Y'))

    return working_days


def calculate_weekly_working_days(start_date):
    d = datetime.strptime(start_date, '%Y-%m-%d')
    monday = d - timedelta(days=d.weekday())
    return [(monday + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(5)]


def get_leave_balance_from_db(company_id, name, ym):
    try:
        conn = get_db_connection()
        if not conn:
            return 2, 0
        cursor = conn.cursor()
        cursor.execute("""
            SELECT "Leaves Allowed", "Leaves Taken" FROM Leaves 
            WHERE "Company ID" = ? AND "User Name" = ? AND "Year-Month" = ?
        """, (company_id, name, ym))
        row = cursor.fetchone()
        conn.close()
        if row:
            return int(row['Leaves Allowed']), int(row['Leaves Taken'])
        return 2, 0
    except Exception as e:
        logger.error(f"Error in get_leave_balance_from_db: {e}")
        return 2, 0


def generate_company_id(company_name):
    try:
        conn = get_db_connection()
        if not conn:
            return f"{company_name}_01"
        cursor = conn.cursor()
        cursor.execute('SELECT "Company ID" FROM Companies WHERE "Company ID" LIKE ?', (f"{company_name}_%",))
        existing_ids = cursor.fetchall()
        conn.close()

        filtered = [cid['Company ID'] for cid in existing_ids if cid['Company ID'].startswith(company_name + "_")]
        if not filtered:
            return f"{company_name}_01"
        suffixes = [int(cid.split("_")[1]) for cid in filtered if len(cid.split("_")) == 2 and cid.split("_")[1].isdigit()]
        max_suffix = max(suffixes) if suffixes else 0
        return f"{company_name}_{str(max_suffix + 1).zfill(2)}"
    except Exception as e:
        logger.error(f"Error in generate_company_id: {e}")
        return f"{company_name}_01"


def get_table_name_if_exists(table_name):
    try:
        conn = get_db_connection()
        if not conn:
            return None
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None
    except Exception as e:
        logger.error(f"Error in get_table_name_if_exists: {e}")
        return None


def get_sheet_id(sheet_title):
    return get_table_name_if_exists(sheet_title)
