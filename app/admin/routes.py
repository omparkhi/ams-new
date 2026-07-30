from flask import Blueprint, render_template, session, redirect, url_for, request, flash , jsonify , send_file
from datetime import datetime, timedelta, time, date
import os
from app.utils.google import service
from app.utils.attendance_utils import (
    read_attendance_from_db,
    update_attendance_in_db,
    get_checkin_image_base64,
    calculate_hours,
    get_company_times_from_db,
    calculate_working_days,
    log_attendance
)
import openpyxl
from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import FormulaRule
import base64
from openpyxl.styles import PatternFill, Font, Alignment
from PIL import Image
import io
import numpy as np
from pytz import timezone
import re
from app.utils.face_utils import (load_encodings , find_best_match)
import logging
from app.utils.db_utils import get_db_connection , fetch_user_by_name_from_company_table,delete_user_from_company_table
from app.utils.performance_utils import measure_performance
import face_recognition

admin_bp = Blueprint('admin', __name__)

# Configuration (make sure these are set properly)
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
TEMP_CHECKIN_IMAGES_DIR = "temp_checkin_images"

india_offset = timedelta(hours=5, minutes=30)

# Logger setup
logger = logging.getLogger(__name__)

# @admin_bp.route('/dashboard', endpoint='dashboard', methods=['GET', 'POST'])
# def admin_panel():
#     if 'username' not in session or session.get('role') != 'company_admin':
#         return redirect(url_for('main.login'))

#     company_id = session.get('company_id')
#     company_name = session.get('company_name')
#     today = datetime.now().strftime('%d/%m/%Y')
#     current_year_month = datetime.now().strftime('%Y-%m')

#     # Fetch company info
#     result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:K').execute()
#     companies = result.get('values', [])
#     company = next((c for c in companies if c[0] == company_id), None)
#     company_address = company[7] if company and len(company) > 7 else ''
#     company_contact = company[8] if company and len(company) > 8 else ''
#     company_email = company[9] if company and len(company) > 9 else ''
#     leaves_per_month = int(company[10]) if company and len(company) > 10 and company[10] else 2

#     # Fetch users
#     result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Users!A2:B').execute()
#     users = result.get('values', [])
#     names = [user[1] for user in users if len(user) >= 2 and user[0] == company_id]

#     # Leave balances
#     leave_balances = []
#     leave_result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Leaves!A2:F100').execute()
#     leave_records = leave_result.get('values', [])
#     for record in leave_records:
#         if len(record) >= 3 and record[0] == company_id and record[2] == current_year_month:
#             leave_balances.append({
#                 'user_name': record[1],
#                 'leaves_allowed': int(record[3]) if len(record) > 3 else leaves_per_month,
#                 'leaves_taken': int(record[4]) if len(record) > 4 else 0,
#                 'leaves_carried': int(record[5]) if len(record) > 5 else 0
#             })

#     # Attendance data
#     attendance = read_attendance_from_db(company_id)
#     initial_data = {}
#     for name in names:
#         checkin, checkout, status, hours, checkin_image, day_status = '', '', 'Absent', '0', '', 'Absent'
#         allow_checkout = False
#         today_records = [r for r in attendance if r[0] == name and r[1] == today]
#         if today_records:
#             record = today_records[-1]
#             checkin = record[2] or ''
#             checkout = record[3] or ''
#             status = record[4] or 'Absent'
#             hours = record[6] or '0'
#             checkin_image = get_checkin_image_base64(company_id, name, today) 
#             day_status = record[7] if len(record) > 7 else 'Absent'
#             allow_checkout = checkin and not checkout
#         initial_data[name] = {
#             'checkin': checkin,
#             'checkout': checkout,
#             'status': status,
#             'hours': hours,
#             'checkin_image': checkin_image,
#             'day_status': day_status,
#             'allow_checkout': allow_checkout
#         }

#     # POST: Force checkout
#     if request.method == 'POST' and 'force_checkout' in request.form:
#         name = request.form['force_checkout']
#         now = datetime.now()
#         india_offset = timedelta(hours=5, minutes=30)  # 5:30 hours for IST
#         india_time = now + india_offset

#         time_str = india_time.strftime('%H:%M:%S')
#         for record in attendance:
#             if record[0] == name and record[1] == today and record[2] and not record[3]:
#                 record[3] = time_str
#                 record[4] = 'Present'
#                 record[6] = calculate_hours(record[2], time_str)
#                 record[7] = 'Present'
#                 update_attendance_in_db(company_id, attendance)

#                 image_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{name}_{today.replace('/', '-')}.jpg")
#                 if os.path.exists(image_path):
#                     try:
#                         os.remove(image_path)
#                         logger.info(f"Deleted check-in image for {name}")
#                     except Exception as e:
#                         logger.error(f"Error deleting check-in image for {name}: {str(e)}")

#                 flash('Checkout forced successfully', 'success')
#                 return redirect(url_for('admin.dashboard'))

#     return render_template(
#         'admin_panel.html',
#         company_id=company_id,
#         company_name=company_name,
#         company_address=company_address,
#         company_contact=company_contact,
#         company_email=company_email,
#         today=today,
#         current_year_month=current_year_month,
#         names=names,
#         initial_data=initial_data,
#         show_full_dashboard=True,
#         leaves_per_month=leaves_per_month,
#         leave_balances=leave_balances
#     )



# @admin_bp.route('/dashboard', endpoint='dashboard', methods=['GET', 'POST'])
# def admin_panel():
#     if 'username' not in session or session.get('role') != 'company_admin':
#         return redirect(url_for('main.login'))

#     company_id = session.get('company_id')
#     company_name = session.get('company_name')
#     today = datetime.now().strftime('%d/%m/%Y')

#     # Fetch users from Users table
#     conn = get_db_connection()
#     cursor = conn.cursor()
#     cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ?', (company_id,))
#     names = [row['User Name'] for row in cursor.fetchall()]
#     conn.close()

#     # Fetch today's attendance for all users
#     attendance = read_attendance_from_db(company_id)
#     initial_data = {}

#     for name in names:
#         checkin, checkout, status, hours, checkin_image, day_status = '', '', 'Absent', '0', '', 'Absent'
#         allow_checkout = False
#         today_records = [r for r in attendance if r['name'] == name and r['date'] == today]

#         if today_records:
#             record = today_records[-1]
#             checkin = record['checkin'] or ''
#             checkout = record['checkout'] or ''
#             status = record['status'] or 'Absent'
#             hours = record['hours'] or '0'
#             checkin_image = get_checkin_image_base64(company_id, name, today)
#             day_status = record['day_status'] if 'day_status' in record.keys() else 'Absent'
#             allow_checkout = checkin and not checkout

#         initial_data[name] = {
#             'checkin': checkin,
#             'checkout': checkout,
#             'status': status,
#             'hours': hours,
#             'checkin_image': checkin_image,
#             'day_status': day_status,
#             'allow_checkout': allow_checkout
#         }

#     # Force checkout POST handler
#     if request.method == 'POST' and 'force_checkout' in request.form:
#         name = request.form['force_checkout']
#         now = datetime.now()
#         india_time = now + timedelta(hours=5, minutes=30)
#         time_str = india_time.strftime('%H:%M:%S')

#         for record in attendance:
#             if record['name'] == name and record['date'] == today and record['checkin'] and not record['checkout']:
#                 record['checkout'] = time_str
#                 record['status'] = 'Present'
#                 record['hours'] = calculate_hours(record['checkin'], time_str)
#                 record['day_status'] = 'Present'
#                 update_attendance_in_db(company_id, [
#                     (
#                         r['name'], r['date'], r['checkin'], r['checkout'],
#                         r['status'], r.get('remarks', ''), r['hours'], r.get('day_status', '')
#                     ) for r in attendance
#                 ])

#                 # Delete check-in image
#                 image_path = os.path.join('checkin_images', f"{company_id}_{name}_{today.replace('/', '-')}.jpg")
#                 if os.path.exists(image_path):
#                     try:
#                         os.remove(image_path)
#                     except Exception as e:
#                         print(f"Error deleting image: {e}")

#                 flash('Checkout forced successfully', 'success')
#                 return redirect(url_for('admin.dashboard'))

#     return render_template(
#         'admin_panel.html',
#         company_id=company_id,
#         company_name=company_name,
#         today=today,
#         names=names,
#         initial_data=initial_data,
#         show_full_dashboard=True
#     )



# @admin_bp.route('/dashboard', endpoint='dashboard', methods=['GET', 'POST'])
# def admin_panel():
#     if 'username' not in session or session.get('role') != 'company_admin':
#         return redirect(url_for('main.login'))

#     company_id = session.get('company_id')
#     company_name = session.get('company_name')
#     today = datetime.now().strftime('%d/%m/%Y')

#     # Fetch users from Users table
#     conn = get_db_connection()
#     cursor = conn.cursor()
#     cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ?', (company_id,))
#     names = [row[0] for row in cursor.fetchall()]  # Use row[0] since `User Name` is in the first column
#     conn.close()

#     # Fetch today's attendance for all users
#     attendance = read_attendance_from_db(company_id)

#     # Debug: Print out the attendance structure
#     print(f"Attendance data: {attendance}")  # Debugging

#     initial_data = {}

#     for name in names:
#         checkin, checkout, status, hours, checkin_image, day_status = '', '', 'Absent', '0', '', 'Absent'
#         allow_checkout = False
        
#         # Adjust this line based on the actual structure of `attendance`
#         today_records = [r for r in attendance if r['name'] == name and r['date'] == today]
        
#         if today_records:
#             record = today_records[-1]
#             checkin = record['checkin'] or ''
#             checkout = record['checkout'] or ''
#             status = record['status'] or 'Absent'
#             hours = record['hours'] or '0'
#             checkin_image = get_checkin_image_base64(company_id, name, today)
#             day_status = record['day_status'] if 'day_status' in record else 'Absent'
#             allow_checkout = checkin and not checkout

#         initial_data[name] = {
#             'checkin': checkin,
#             'checkout': checkout,
#             'status': status,
#             'hours': hours,
#             'checkin_image': checkin_image,
#             'day_status': day_status,
#             'allow_checkout': allow_checkout
#         }

#     return render_template(
#         'admin_panel.html',
#         company_id=company_id,
#         company_name=company_name,
#         today=today,
#         names=names,
#         initial_data=initial_data,
#         show_full_dashboard=True
#     )


# @admin_bp.route('/dashboard', endpoint='dashboard', methods=['GET', 'POST'])
# @measure_performance
# def admin_panel():
#     if 'username' not in session or session.get('role') != 'company_admin':
#         return redirect(url_for('main.login'))

#     company_id = session.get('company_id')
#     company_name = session.get('company_name')
#     today = datetime.now().strftime('%d/%m/%Y')

#     # Fetch users from Users table
#     conn = get_db_connection()
#     cursor = conn.cursor()
#     cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ?', (company_id,))
#     names = [row[0] for row in cursor.fetchall()]  # Use row[0] since `User Name` is in the first column
    
#     conn.close()


#     # Fetch today's attendance for all users
#     attendance = read_attendance_from_db(company_id)

#     # Debugging to print the structure of attendance
#     # print(f"Attendance structure: {attendance}")

#     initial_data = {}

#     for name in names:
#         checkin, checkout, status, hours, checkin_image, day_status = '', '', 'Absent', '0', '', 'Absent'
#         allow_checkout = False

#         # Adjust this based on the structure of `attendance`
#         today_records = [r for r in attendance if r[0] == name and r[1] == today]  # Adjusted to use index

#         if today_records:
#             record = today_records[-1]  # Get the most recent record for today
#             checkin = record[2]  # Index 2 is checkin time
#             checkout = record[3]  # Index 3 is checkout time
#             status = record[4]  # Index 4 is status
#             hours = record[7]  # Index 7 is day status (or modify as needed)
#             checkin_image = get_checkin_image_base64(company_id, name, today)
#             day_status = record[7] if len(record) > 7 else 'Absent'  # Check if day status exists
#             allow_checkout = checkin and not checkout

#         initial_data[name] = {
#             'checkin': checkin,
#             'checkout': checkout,
#             'status': status,
#             'hours': hours,
#             'checkin_image': checkin_image,
#             'day_status': day_status,
#             'allow_checkout': allow_checkout
#         }

#         if request.method == 'POST' and 'force_checkout' in request.form:
#             name = request.form['force_checkout']
#             now = datetime.now()
#             india_time = now + timedelta(hours=5, minutes=30)
#             time_str = india_time.strftime('%H:%M:%S')

#             for idx, record in enumerate(attendance):
#                 if record[0] == name and record[1] == today and record[2] and not record[3]:  # name, date, checkin, checkout
#                     updated_record = list(record)
#                     updated_record[3] = time_str  # checkout
#                     updated_record[4] = 'Present'  # status
#                     updated_record[6] = calculate_hours(updated_record[2], time_str)  # hours
#                     updated_record[7] = 'Present'  # day_status
#                     attendance[idx] = tuple(updated_record)

#                     # Update DB
#                     update_attendance_in_db(company_id, attendance)

#                     # Delete check-in image if exists
#                     image_path = os.path.join('checkin_images', f"{company_id}_{name}_{today.replace('/', '-')}.jpg")
#                     if os.path.exists(image_path):
#                         try:
#                             os.remove(image_path)
#                         except Exception as e:
#                             print(f"Error deleting image: {e}")

#                     flash('Checkout forced successfully', 'success')
#                     return redirect(url_for('admin.dashboard'))

#     return render_template(
#         'admin_panel.html',
#         company_id=company_id,
#         company_name=company_name,
#         today=today,
#         names=names,
#         initial_data=initial_data,
#         show_full_dashboard=True
#     )


@admin_bp.route('/dashboard', endpoint='dashboard', methods=['GET', 'POST'])
@measure_performance
def admin_panel():
    if 'username' not in session or session.get('role') != 'company_admin':
        return redirect(url_for('main.login'))

    company_id = session.get('company_id')
    company_name = session.get('company_name')
    today = datetime.now().strftime('%d/%m/%Y')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch users for this company
    cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ?', (company_id,))
    names = [row[0] for row in cursor.fetchall()]

    # Fetch company details
    cursor.execute('SELECT "Address", "Contact", "Email" FROM Companies WHERE "Company ID" = ?', (company_id,))
    company_row = cursor.fetchone()
    
    if not company_row:
        company_address, company_contact, company_email = 'N/A', 'N/A', 'N/A'
    else:
        company_address = company_row[0] or ''
        company_contact = company_row[1] or ''
        company_email = company_row[2] or ''

    conn.close()

    # Fetch today's attendance
    attendance = read_attendance_from_db(company_id)
    initial_data = {}

    for name in names:
        checkin, checkout, status, hours, checkin_image, day_status = '', '', 'Absent', '0', '', 'Absent'
        allow_checkout = False

        today_records = [r for r in attendance if r[0] == name and r[1] == today]

        if today_records:
            record = today_records[-1]
            checkin = record[2]
            checkout = record[3]
            status = record[4]
            hours = record[6]
            day_status = record[7] if len(record) > 7 else 'Absent'
            checkin_image = get_checkin_image_base64(company_id, name, today)
            allow_checkout = checkin and not checkout

        initial_data[name] = {
            'checkin': checkin,
            'checkout': checkout,
            'status': status,
            'hours': hours,
            'checkin_image': checkin_image,
            'day_status': day_status,
            'allow_checkout': allow_checkout
        }

    # Handle POST force checkout
    if request.method == 'POST' and 'force_checkout' in request.form:
        name = request.form['force_checkout']
        now = datetime.now() + timedelta(hours=5, minutes=30)
        time_str = now.strftime('%H:%M:%S')

        for idx, record in enumerate(attendance):
            if record[0] == name and record[1] == today and record[2] and not record[3]:
                updated_record = list(record)
                updated_record[3] = time_str
                updated_record[4] = 'Present'
                updated_record[6] = calculate_hours(updated_record[2], time_str)
                updated_record[7] = 'Present'
                attendance[idx] = tuple(updated_record)

                update_attendance_in_db(company_id, attendance)

                image_path = os.path.join('checkin_images', f"{company_id}_{name}_{today.replace('/', '-')}.jpg")
                if os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                    except Exception as e:
                        print(f"Error deleting image: {e}")

                flash('Checkout forced successfully', 'success')
                return redirect(url_for('admin.dashboard'))

    return render_template(
        'admin_panel.html',
        company_id=company_id,
        company_name=company_name,
        company_address=company_address,
        company_contact=company_contact,
        company_email=company_email,
        today=today,
        names=names,
        initial_data=initial_data,
        show_full_dashboard=True
    )


@admin_bp.route('/setup_company_times', methods=['GET', 'POST'])
def setup_company_times():
    if 'username' not in session or session.get('role') != 'company_admin':
        return redirect(url_for('main.login'))

    company_id = session.get('company_id')
    company_name = session.get('company_name')

    if request.method == 'POST':
        check_in_time = request.form.get('check_in_time', '').strip()
        check_out_time = request.form.get('check_out_time', '').strip()
        required_hours = request.form.get('required_hours', '').strip()

        try:
            if not re.match(r'^\d{2}:\d{2}$', check_in_time):
                raise ValueError("Invalid check-in time format")
            if not re.match(r'^\d{2}:\d{2}$', check_out_time):
                raise ValueError("Invalid check-out time format")
            float(required_hours)
            check_in_time += ':00'
            check_out_time += ':00'
            datetime.strptime(check_in_time, '%H:%M:%S')
            datetime.strptime(check_out_time, '%H:%M:%S')
        except ValueError as e:
            flash(f"Invalid input: {str(e)}. Use HH:MM for times and a number for hours.", "error")
            return render_template('setup_company_times.html', company_name=company_name,
                                   check_in='10:00', check_out='18:30', required_hours='7.0')

        # Update in Google Sheet
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:G').execute()
        companies = result.get('values', [])
        row_index = None
        for i, row in enumerate(companies, start=2):
            if row[0] == company_id:
                row_index = i
                break

        if row_index:
            service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=f'Companies!E{row_index}:G{row_index}',
                valueInputOption='RAW',
                body={'values': [[check_in_time, check_out_time, required_hours]]}
            ).execute()
            flash("Company times updated successfully.", "success")
            return redirect(url_for('admin.dashboard'))
        else:
            flash("Company not found.", "error")

    check_in, check_out, required_hours = get_company_times_from_db(company_id)
    if not all([check_in, check_out, required_hours]):
        check_in, check_out, required_hours = '10:00', '18:30', '7.0'
        flash("Please set up company times.", "error")
    else:
        check_in = check_in[:5]
        check_out = check_out[:5]

    return render_template('setup_company_times.html', company_name=company_name,
                           check_in=check_in, check_out=check_out, required_hours=required_hours)


# @admin_bp.route('/update_company_info', methods=['POST'])
# def update_company_info():
#     if 'username' not in session or session.get('role') != 'company_admin':
#         return redirect(url_for('login'))

#     company_id = session.get('company_id')
#     company_address = request.form.get('company_address')
#     company_contact = request.form.get('company_contact')
#     company_email = request.form.get('company_email')

#     result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:K').execute()
#     companies = result.get('values', [])
#     row_index = None
#     for idx, company in enumerate(companies, start=2):
#         if company[0] == company_id:
#             row_index = idx
#             break

#     if row_index is None:
#         flash('Company not found', 'error')
#         return redirect(url_for('admin.dashboard'))

#     update_values = [
#         company_id,
#         session.get('company_name'),
#         companies[row_index-2][2] if len(companies[row_index-2]) > 2 else '',
#         companies[row_index-2][3] if len(companies[row_index-2]) > 3 else '',
#         companies[row_index-2][4] if len(companies[row_index-2]) > 4 else '',
#         companies[row_index-2][5] if len(companies[row_index-2]) > 5 else '',
#         companies[row_index-2][6] if len(companies[row_index-2]) > 6 else '',
#         company_address,
#         company_contact,
#         company_email,
#         companies[row_index-2][10] if len(companies[row_index-2]) > 10 else '2'
#     ]
#     body = {
#         'values': [update_values]
#     }
#     range_name = f'Companies!A{row_index}:K{row_index}'
#     service.spreadsheets().values().update(
#         spreadsheetId=SHEET_ID,
#         range=range_name,
#         valueInputOption='RAW',
#         body=body
#     ).execute()

#     flash('Company information updated successfully', 'success')
#     return redirect(url_for('admin.admin_panel'))


@admin_bp.route('/update_company_info', methods=['POST'])
def update_company_info():
    if 'username' not in session or session.get('role') != 'company_admin':
        return redirect(url_for('main.login'))

    company_id = session.get('company_id')
    company_address = request.form.get('company_address')
    company_contact = request.form.get('company_contact')
    company_email = request.form.get('company_email')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Step 1: Get existing column names
    cursor.execute("PRAGMA table_info(Companies)")
    existing_columns = [col[1] for col in cursor.fetchall()]

    # Step 2: Add missing columns if necessary
    if "Address" not in existing_columns:
        cursor.execute('ALTER TABLE Companies ADD COLUMN "Address" TEXT')
    if "Contact" not in existing_columns:
        cursor.execute('ALTER TABLE Companies ADD COLUMN "Contact" TEXT')
    if "Email" not in existing_columns:
        cursor.execute('ALTER TABLE Companies ADD COLUMN "Email" TEXT')

    # Step 3: Check if company exists
    cursor.execute('SELECT * FROM Companies WHERE "Company ID" = ?', (company_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        flash('Company not found', 'error')
        return redirect(url_for('admin.dashboard'))

    # Step 4: Update the company info
    cursor.execute('''
        UPDATE Companies
        SET "Address" = ?, "Contact" = ?, "Email" = ?
        WHERE "Company ID" = ?
    ''', (company_address, company_contact, company_email, company_id))

    conn.commit()
    conn.close()

    flash('Company information updated successfully', 'success')
    return redirect(url_for('admin.dashboard'))


@admin_bp.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    if session.get('role') != 'company_admin':
        return redirect(url_for('main.login'))

    company_id = session.get('company_id')
    name = request.form['mark_user']
    status = request.form[f'status_{name}']
    india = timezone('Asia/Kolkata')
    date_str = datetime.now(india).strftime('%d/%m/%Y')
    checkin = request.form.get(f'checkin_{name}', '').strip()
    checkout = request.form.get(f'checkout_{name}', '').strip()

    print(f"Marking attendance for {name} on {date_str} {company_id} with checkin: {checkin}, checkout: {checkout}")
    attendance = read_attendance_from_db(company_id)
    today_records = [r for r in attendance if r[0] == name and r[1] == date_str]
    updated = False

    # Get company-specific times
    # try:
    #     check_in_time, check_out_time, required_hours = get_company_times_from_db(company_id)
    # except ValueError as e:
    #     logger.error(f"Cannot mark attendance: {str(e)}")
    #     flash("Company times not configured. Please set them up.", "error")
    #     return redirect(url_for('setup_company_times'))
    
    check_in_time = '09:00:00'
    check_out_time = '18:00:00'
    required_hours = 8


    check_in_dt = datetime.strptime(check_in_time, '%H:%M:%S')
    check_in_30min_later = (check_in_dt + timedelta(minutes=30)).time()
    check_in_1hr_later = (check_in_dt + timedelta(hours=1)).time()
    check_in_2hr_later = (check_in_dt + timedelta(hours=2)).time()

    if today_records:
        last_record = today_records[-1]
        if checkin and not last_record[2]:
            try:
                checkin_dt = datetime.strptime(checkin + ':00', '%H:%M:%S')
                checkin_time = checkin_dt.time()
                checkin_dt_full = datetime.combine(datetime.today(), checkin_time)
                day_status = 'Full Day'
                expected_checkout = check_out_time

                if datetime.combine(datetime.today(), check_in_dt.time()) <= checkin_dt_full < datetime.combine(datetime.today(), check_in_30min_later):
                    expected_checkout = '18:30:00'
                elif datetime.combine(datetime.today(), check_in_30min_later) <= checkin_dt_full <= datetime.combine(datetime.today(), check_in_1hr_later):
                    delay_minutes = (checkin_dt_full - datetime.combine(datetime.today(), check_in_30min_later)).total_seconds() / 60
                    check_out_dt = datetime.strptime(check_out_time, '%H:%M:%S') + timedelta(minutes=delay_minutes)
                    expected_checkout = check_out_dt.strftime('%H:%M:%S')
                elif datetime.combine(datetime.today(), check_in_1hr_later) < checkin_dt_full <= datetime.combine(datetime.today(), check_in_2hr_later):
                    expected_checkout = check_out_time
                    day_status = 'Full Day'
                elif checkin_dt_full > datetime.combine(datetime.today(), check_in_2hr_later):
                    expected_checkout = check_out_time
                    day_status = 'Full Day'

                last_record[2] = checkin + ':00'
                last_record[4] = 'Present'
                last_record[5] = expected_checkout
                last_record[7] = day_status
                updated = True
            except ValueError:
                flash("Invalid check-in time format.", "error")
                return redirect(url_for('admin.dashboard'))
        elif checkout and last_record[2] and not last_record[3]:
            try:
                checkin_time = datetime.strptime(last_record[2], '%H:%M:%S')
                checkout_dt = datetime.strptime(checkout + ':00', '%H:%M:%S')
                time_since_checkin = datetime.now(india) - datetime.combine(date.today(), checkin_time.time())
                expected_checkout = datetime.strptime(last_record[5], '%H:%M:%S') if last_record[5] else datetime.strptime(check_out_time, '%H:%M:%S')
                if time_since_checkin >= timedelta(hours=required_hours) or session.get('role') == 'company_admin':
                    last_record[3] = checkout + ':00'
                    last_record[4] = 'Present'
                    last_record[6] = calculate_hours(last_record[2], checkout + ':00')
                    updated = True
                else:
                    flash("Checkout not allowed yet.", "error")
                    return redirect(url_for('admin.dashboard'))
            except ValueError:
                flash("Invalid check-out time format.", "error")
                return redirect(url_for('admin.dashboard'))
    else:
        try:
            day_status = 'Full Day'
            expected_checkout = check_out_time
            checkin_time = checkin + ':00' if checkin else ''
            checkout_time = checkout + ':00' if checkout else ''
            if checkin:
                checkin_dt = datetime.strptime(f'{datetime.today().strftime("%Y-%m-%d")} {checkin}', '%Y-%m-%d %H:%M')
                checkin_dt = checkin_dt.replace(tzinfo=timezone('Asia/Kolkata'))
                checkin_time_only = datetime.strptime(checkin + ':00', '%H:%M:%S').time()
                checkin_dt_full = datetime.combine(datetime.today(), checkin_time_only)

                if datetime.combine(datetime.today(), check_in_dt.time()) <= checkin_dt_full < datetime.combine(datetime.today(), check_in_30min_later):
                    expected_checkout = '18:30:00'
                elif datetime.combine(datetime.today(), check_in_30min_later) <= checkin_dt_full <= datetime.combine(datetime.today(), check_in_1hr_later):
                    delay_minutes = (checkin_dt_full - datetime.combine(datetime.today(), check_in_30min_later)).total_seconds() / 60
                    check_out_dt = datetime.strptime(check_out_time, '%H:%M:%S') + timedelta(minutes=delay_minutes)
                    expected_checkout = check_out_dt.strftime('%H:%M:%S')
                elif datetime.combine(datetime.today(), check_in_1hr_later) < checkin_dt_full <= datetime.combine(datetime.today(), check_in_2hr_later):
                    expected_checkout = check_out_time
                    day_status = 'Full Day'
                elif checkin_dt_full > datetime.combine(datetime.today(), check_in_2hr_later):
                    expected_checkout = check_out_time
                    day_status = 'Full Day'

            hours = calculate_hours(checkin_time, checkout_time) if checkin_time and checkout_time else ''
            attendance.append([name, date_str, checkin_time, checkout_time, 'Present' if checkin_time else 'Absent', expected_checkout, hours, day_status])
            updated = True
        except ValueError:
            flash("Invalid time format.", "error")
            return redirect(url_for('admin.dashboard'))

    if updated:
        try:
            
            update_attendance_in_db(company_id, attendance)
            flash("Attendance updated successfully.", "success")
        except Exception as e:
            logger.error(f"Error in mark_attendance: {e}")
            flash("Error updating attendance.", "error")
            return redirect(url_for('admin.dashboard'))

    return redirect(url_for('admin.dashboard'))



@admin_bp.route('/user_panel', methods=['GET', 'POST'])
def user_panel():
    if session.get('role') == 'super_admin':
        return redirect(url_for('super_admin'))

    company_id = session.get('company_id')
    known_faces = load_encodings(company_id)
    action = "Welcome, please start recognition"
    name = "Unknown"

    if request.method == 'POST':
        try:
            # Check if the request has the correct Content-Type
            if not request.is_json:
                logger.error("Invalid request: JSON data required")
                return jsonify({'action': 'Invalid request. Content-Type must be application/json.', 'name': name}), 400

            # Parse JSON data
            data = request.get_json(silent=True)
            if data is None:
                logger.error("Invalid JSON format in request")
                return jsonify({'action': 'Invalid JSON format. Please ensure the request body is valid JSON.', 'name': name}), 400

            # Check for the 'image' field
            if 'image' not in data:
                logger.error("No image provided in request")
                return jsonify({'action': 'No image provided. Please capture an image.', 'name': name}), 400

            image_data = data['image']
            if not isinstance(image_data, str):
                logger.error("Image data is not a string")
                return jsonify({'action': 'Image data must be a string.', 'name': name}), 400

            if not image_data:
                logger.error("Image data is empty")
                return jsonify({'action': 'Image data is empty. Please capture a valid image.', 'name': name}), 400

            logger.debug("Received base64 image data")

            # Step 1: Decode base64 image
            try:
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                image_data += '=' * (-len(image_data) % 4)
                image_bytes = base64.b64decode(image_data, validate=True)
                logger.debug("Base64 decoded successfully")
            except (base64.binascii.Error, ValueError) as e:
                logger.error(f"Base64 decoding error: {str(e)}")
                return jsonify({'action': f'Invalid base64 image data: {str(e)}', 'name': name}), 400

            # Step 2: Convert image to RGB format for face_recognition
            try:
                image = Image.open(io.BytesIO(image_bytes))
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                frame = np.array(image)
                rgb_frame = frame
                logger.debug(f"Image converted to RGB, shape: {frame.shape}")
            except Exception as e:
                logger.error(f"Error opening or converting image: {str(e)}")
                return jsonify({'action': 'Error processing image. Ensure the image is a valid JPEG.', 'name': name}), 400

            # Step 3: Detect faces in the image
            try:
                face_locations = face_recognition.face_locations(rgb_frame, model="hog")
                if not face_locations:
                    logger.warning("No faces detected in image")
                    return jsonify({'action': 'No face detected. Ensure a face is clearly visible in the frame.', 'name': name}), 400
                logger.debug(f"Detected {len(face_locations)} face(s)")
            except Exception as e:
                logger.error(f"Error detecting faces: {str(e)}")
                return jsonify({'action': 'Error detecting faces. Ensure the image quality is good and try again.', 'name': name}), 500

            # Step 4: Generate face encodings
            try:
                face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                if not face_encodings:
                    logger.warning("No face encodings generated")
                    return jsonify({'action': 'Face encoding failed. Ensure the face is clear and well-lit.', 'name': name}), 400
                logger.debug(f"Generated {len(face_encodings)} face encoding(s)")
            except Exception as e:
                logger.error(f"Error generating face encodings: {str(e)}")
                return jsonify({'action': 'Error encoding face. Ensure the image quality is good and try again.', 'name': name}), 500

            # Step 5: Match the face with known faces
            for face_encoding in face_encodings:
                try:
                    match_result = find_best_match(face_encoding, known_faces)
                    if match_result:
                        name, best_distance = match_result
                        logger.info(f"Recognized: {name} with distance {best_distance}")
                        attendance = read_attendance_from_db(company_id)
                        india_offset = timedelta(hours=5, minutes=30)
                        current_time = datetime.now() 
                        today = current_time.strftime('%d/%m/%Y')
                        time_str = current_time.strftime('%H:%M:%S')
                        today_records = [r for r in attendance if r[0] == name and r[1] == today]
                        now = current_time

                        print(f"[TIME] User panel accessed at: {current_time.strftime('%Y-%m-%d %H:%M:%S')} IST")
                        print(f"[DEBUG] Processing face recognition for {name} on {today} at {time_str}")

                        # Define noon time for cutoff (12:00 PM)
                        noon_time = current_time.replace(hour=12, minute=0, second=0, microsecond=0) 
                        noon = datetime.strptime(f"{today} 12:00:00", '%d/%m/%Y %H:%M:%S')
                        print(f'{noon_time}  p {now}')

                        # Check if it's before noon

                        if not today_records:
                            # if now > noon_time:
                            #     action = "Check-in allowed before noon"
                            #     action = f"Check-in not allowed after noon (12:00 PM). It's {current_time.strftime('%H:%M:%S')} now."
                            #     print(f"[TIME] Check-in allowed before noon.")
                            # else:
                            success, expected_checkout, day_status = log_attendance(company_id, name, 'checkin')
                            if success:
                            # If no records, proceed with check-in logic
                                action = f"Checked in successfully. Expected check-out: {expected_checkout}. Day Status: {day_status}"
                                image_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{name}_{today.replace('/', '-')}.jpg")
                                try:
                                    image.save(image_path)
                                    logger.info(f"Saved check-in image: {name}")
                                except Exception as e:
                                    logger.error(f"Error saving check-in image: {str(e)}")
                                    action += " (Warning: Failed to save check-in image)"
                            else:
                                action = "Error processing check-in."
                            
                        else:
                            last_record = today_records[-1]
                            checkin_time = datetime.strptime(last_record[2], '%H:%M:%S') if last_record[2] else None
                            checkout_time = datetime.strptime(last_record[3], '%H:%M:%S') if last_record[3] else None
                            if checkout_time:
                                action = 'Attendance completed for today'
                            elif checkin_time and not checkout_time:
                                time_since_checkin = now - (datetime.combine(date.today(), checkin_time.time())) + india_offset
                                print(f"[DEBUG] Time since last check-in: {time_since_checkin}")
                                print(f"[DEBUG] Required hours: {last_record[6]}")
                                print(f"[DEBUG] Last record: {now}")
                                print(f"[DEBUG] Last record time: {(datetime.combine(date.today(), checkin_time.time()))}")

                                if time_since_checkin >= timedelta(hours=6):
                                    success, hours, day_status = log_attendance(company_id, name, 'checkout')
                                    if success:
                                        action = f"Checked out successfully. Hours: {hours}. Day Status: {day_status}"
                                        image_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{name}_{today.replace('/', '-')}.jpg")
                                        print(  f"[DEBUG] Image path: {image_path}")
                                        if os.path.exists(image_path):
                                            try:
                                                os.remove(image_path)
                                                logger.info(f"Deleted check-in image: {name}")
                                            except Exception as e:
                                                logger.error(f"Error deleting check-in image: {str(e)}")
                                    else:
                                        action = "Error processing check-out."
                                else:
                                    remaining_time = timedelta(hours=6) - time_since_checkin
                                    remaining_hours = remaining_time.seconds // 3600
                                    remaining_minutes = (remaining_time.seconds % 3600) // 60
                                    action = f"Cannot check out yet, minimum 6 hours required. You can check out in {remaining_hours} hour(s) and {remaining_minutes} minute(s)."
                                    # action = f"Cannot check out yet, minimum 7 hours required."
                            else:
                                action = 'Invalid attendance state'
                    
                    else:
                        name = "Unknown"
                        action = "Unknown user."
                except Exception as e:
                    logger.error(f"Error matching face: {str(e)}")
                    return jsonify({'action': 'Error matching face. Ensure the face matches a registered user.', 'name': name}), 500

            return jsonify({'action': action, 'name': name})

        except Exception as e:
            logger.error(f"Unexpected error in user_panel: {str(e)}")
            return jsonify({'action': f'Unexpected server error: {str(e)}', 'name': name}), 500

    return render_template('user_panel.html', name=name, action=action, known_faces=known_faces)


@admin_bp.route('/update_leave_config', methods=['POST'])
def update_leave_config():
    print(f'{request.form}')
    if 'username' not in session or session.get('role') != 'company_admin':
        return redirect(url_for('login'))

    company_id = request.form.get('company_id')
    leaves_per_month = request.form.get('leaves_per_month')
    

    if not leaves_per_month.isdigit() or int(leaves_per_month) < 0:
        flash('Invalid number of leaves', 'error')
        return redirect(url_for('admin.dashboard'))

    try:
        # Fetch Companies sheet
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:E').execute()
        companies = result.get('values', [])
        logger.debug(f"Fetched {len(companies)} companies from sheet")

        # Find and update the company
        for i, company in enumerate(companies):
            if company[1] == company_id:
                # Ensure company has 5 columns
                while len(company) < 5:
                    company.append('2')  # Default LeavesPerMonth
                    logger.info(f"Padded company {company_id} with default LeavesPerMonth=2")
                company[4] = leaves_per_month
                companies[i] = company
                logger.info(f"Updated LeavesPerMonth to {leaves_per_month} for company {company_id}")
                break
        else:
            logger.error(f"Company {company_id} not found in Companies sheet")
            flash('Company not found', 'error')
            return redirect(url_for('admin.dashboard'))

        # Update the sheet
        service.spreadsheets().values().update(
            spreadsheetId=SHEET_ID,
            range='Companies!A2:E',
            valueInputOption='RAW',
            body={'values': companies}
        ).execute()
        logger.debug("Companies sheet updated successfully")

        flash('Leave configuration updated successfully', 'success')
    except Exception as e:
        logger.error(f"Error updating leave configuration: {str(e)}")
        flash(f'Error updating leave configuration: {str(e)}', 'error')
        return redirect(url_for('admin.dashboard'))

    return redirect(url_for('admin.dashboard'))


@admin_bp.route('/history', methods=['GET', 'POST'])
def history():
    if session.get('role') != 'company_admin':
        return redirect(url_for('login'))

    company_id = session.get('company_id')
    company_name = session.get('company_name')
    print(f"Company ID: {company_id}, Company Name: {company_name}")
    selected_date = request.form.get('date') if request.method == 'POST' else None
    selected_user = request.form.get('name') if request.method == 'POST' else None
    selected_month = request.form.get('month') if request.method == 'POST' else None
    attendance_records = []
    user_history = []
    registered_users = list(load_encodings(company_id).keys())

    if not registered_users:
        flash("No registered users found.", "warning")
    else:
        flash(f"Found {len(registered_users)} registered users", "info")

    # Define working days (excluding weekends)
    def get_working_days(start_date, end_date):
        working_days = []
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Monday to Friday
                working_days.append(current_date.strftime('%d/%m/%Y'))
            current_date += timedelta(days=1)
        return working_days

    # Fetch attendance data
    attendance = read_attendance_from_db(company_id)

    # Handle case when a specific date is selected
    if selected_date:
        try:
            formatted_date = datetime.strptime(selected_date, '%Y-%m-%d').strftime('%d/%m/%Y')
            # Check if the selected date is a working day
            if datetime.strptime(formatted_date, '%d/%m/%Y').weekday() >= 5:
                flash("Selected date is a weekend. No attendance records available.", "warning")
            else:
                # Generate records only for the selected date
                for user in registered_users:
                    user_records = [r for r in attendance if r[0] == user and r[1] == formatted_date]
                    if user_records:
                        record = user_records[0]
                        in_time = record[2] or ''
                        out_time = record[3] or ''
                        status = record[4] or 'Absent'
                        hours = record[6] or '0'
                        day_status = record[7] if len(record) > 7 else 'Absent'
                        time_display = f"{in_time} - {out_time}" if in_time and out_time else (in_time or out_time or 'N/A')
                        attendance_records.append({
                            'name': user,
                            'status': status,
                            'time': time_display,
                            'hours': hours,
                            'day_status': day_status
                        })
                    else:
                        # Add absent record for the user on the selected date
                        attendance_records.append({
                            'name': user,
                            'status': 'Absent',
                            'time': 'N/A',
                            'hours': '0',
                            'day_status': 'Absent'
                        })
        except ValueError:
            flash("Invalid date format.", "error")

    # Handle user history (only when no specific date is selected)
    elif selected_user:
        # Set date range (default: last 30 days or selected month)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        if selected_month:
            try:
                year, month = map(int, selected_month.split('-'))
                start_date = datetime(year, month, 1)
                end_date = datetime(year, month, (datetime(year, month + 1, 1) - timedelta(days=1)).day)
            except ValueError:
                flash("Invalid month format.", "error")

        working_days = get_working_days(start_date, end_date)

        # Generate comprehensive attendance records for the date range
        comprehensive_attendance = []
        for user in registered_users:
            user_records = [r for r in attendance if r[0] == user]
            user_dates = set(r[1] for r in user_records)
            
            # Add existing records
            comprehensive_attendance.extend(user_records)
            
            # Add absent records for missing working days
            for date in working_days:
                if date not in user_dates:
                    comprehensive_attendance.append([
                        user,  # name
                        date,  # date
                        '',    # check_in
                        '',    # check_out
                        'Absent',  # status
                        '',    # (assuming unused)
                        '0',   # hours
                        'Absent'  # day_status
                    ])

        # Process user history for the selected user
        for record in comprehensive_attendance:
            if record[0] != selected_user:
                continue
            date = record[1]
            if selected_month:
                try:
                    record_month = datetime.strptime(date, '%d/%m/%Y').strftime('%Y-%m')
                    if record_month != selected_month:
                        continue
                except ValueError:
                    continue
            in_time = record[2] or ''
            out_time = record[3] or ''
            status = record[4] or 'Absent'
            hours = record[6] or '0'
            day_status = record[7] if len(record) > 7 else 'Absent'
            time_display = f"{in_time} - {out_time}" if in_time and out_time else (in_time or out_time or 'N/A')
            user_history.append({
                'date': date,
                'status': status,
                'time': time_display,
                'hours': hours,
                'day_status': day_status
            })
    

    return render_template('history.html', 
                           selected_date=selected_date,
                           selected_user=selected_user,
                           selected_month=selected_month,
                           attendance_records=attendance_records,
                           user_history=user_history,
                           registered_users=registered_users,
                           company_name=company_name)


@admin_bp.route('/download_attendance')
def download_attendance():
    if session.get('role') != 'company_admin':
        return redirect(url_for('login'))

    company_id = session.get('company_id')
    attendance = read_attendance_from_db(company_id)
    all_names = list(load_encodings(company_id).keys())

    # Get the selected month from query parameter (format: MM-YYYY, e.g., 04-2025)
    selected_month = request.args.get('month')
    if not selected_month:
        # Default to current month if not specified
        selected_month = datetime.now().strftime('%m-%Y')
    
    try:
        month, year = map(int, selected_month.split('-'))
        month_name = datetime(year, month, 1).strftime('%B %Y')
    except ValueError:
        flash("Invalid month format. Using current month.", "error")
        current_date = datetime.now()
        month = current_date.month
        year = current_date.year
        month_name = current_date.strftime('%B %Y')

    # Get all working days in the selected month (Monday to Friday)
    working_days = calculate_working_days(year, month)
    working_days.sort()  # Ensure dates are in ascending order

    # Filter attendance for the selected month
    filtered_attendance = {}
    for name in all_names:
        filtered_attendance[name] = {}
    for record in attendance:
        name, date_str, in_time, out_time, status, expected_checkout, hours, day_status = record
        try:
            record_date = datetime.strptime(date_str, '%d/%m/%Y')
            if record_date.month == month and record_date.year == year:
                filtered_attendance[name][date_str] = record
        except ValueError:
            continue

    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Attendance - {month_name}"

    # Write headers
    # Row 1: Main headers (Name, dates, Total Days Present)
    main_headers = ['Name']
    for date in working_days:
        main_headers.extend([date, '', ''])
    main_headers.append(f"Total Days Present ({month_name})")
    ws.append(main_headers)

    # Row 2: Sub-headers (Overview, Check-in, Check-out under each date)
    sub_headers = ['']  # Empty cell under "Name"
    for _ in working_days:
        sub_headers.extend(['Overview', 'Check-in', 'Check-out'])
    sub_headers.append('')  # Empty cell under "Total Days Present"
    ws.append(sub_headers)

    # Merge cells for the date headers in Row 1
    for idx, date in enumerate(working_days, start=1):
        start_col = idx * 3 - 1  # Starting column for the date (e.g., B for first date)
        end_col = start_col + 2  # Merge 3 columns (e.g., B, C, D)
        ws.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
        cell = ws.cell(row=1, column=start_col)
        cell.alignment = Alignment(horizontal='center')

    # Apply formatting to headers
    for col_num in range(1, len(main_headers) + 1):
        cell_row1 = ws.cell(row=1, column=col_num)
        cell_row2 = ws.cell(row=2, column=col_num)
        cell_row1.font = Font(bold=True)
        cell_row2.font = Font(bold=True)
        cell_row1.alignment = Alignment(horizontal='center')
        cell_row2.alignment = Alignment(horizontal='center')

    # Populate data for each person
    for row_num, name in enumerate(all_names, start=3):
        row_data = [name]
        present_count = 0
        half_day_count = 0
        for date_str in working_days:
            record = filtered_attendance[name].get(date_str, None)
            if record:
                _, _, in_time, out_time, _, _, _, day_status = record
                in_time_str = in_time.split(':')[0] + ':' + in_time.split(':')[1] if in_time else '-'
                out_time_str = out_time.split(':')[0] + ':' + out_time.split(':')[1] if out_time else '-'
                if day_status == 'Full Day':
                    overview = 'p'
                    present_count += 1
                elif day_status == 'Half Day':
                    overview = 'h'
                    half_day_count += 1
                else:
                    overview = 'a'
                row_data.extend([overview, in_time_str, out_time_str])
            else:
                row_data.extend(['a', '-', '-'])  # Absent if no record

        # Calculate total days present: (p) + (h/2)
        total_days = present_count + (half_day_count / 2)
        row_data.append(f"{total_days:.1f}")
        ws.append(row_data)

    # Apply conditional formatting to the Overview columns
    green_fill = PatternFill(start_color='00FF00', end_color='00FF00', fill_type='solid')
    red_fill = PatternFill(start_color='FF0000', end_color='FF0000', fill_type='solid')
    yellow_fill = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
    white_font = Font(color='FFFFFF')
    black_font = Font(color='000000')

    # Overview columns are at positions 2, 5, 8, ... (every 3rd column starting from B)
    for col_idx in range(2, len(working_days) * 3 + 2, 3):
        col_letter = get_column_letter(col_idx)
        # Apply formatting for Present (p) - green background, white text
        ws.conditional_formatting.add(
            f'{col_letter}3:{col_letter}{ws.max_row}',
            FormulaRule(
                formula=[f'${col_letter}3="p"'],
                stopIfTrue=True,
                fill=green_fill,
                font=white_font
            )
        )
        # Apply formatting for Half Day (h) - red background, white text
        ws.conditional_formatting.add(
            f'{col_letter}3:{col_letter}{ws.max_row}',
            FormulaRule(
                formula=[f'${col_letter}3="h"'],
                stopIfTrue=True,
                fill=red_fill,
                font=white_font
            )
        )
        # Apply formatting for Absent (a) - yellow background, black text
        ws.conditional_formatting.add(
            f'{col_letter}3:{col_letter}{ws.max_row}',
            FormulaRule(
                formula=[f'${col_letter}3="a"'],
                stopIfTrue=True,
                fill=yellow_fill,
                font=black_font
            )
        )

    # Adjust column widths for better readability
    column_widths = {}
    for col_idx in range(1, ws.max_column + 1):
        col_letter = get_column_letter(col_idx)
        max_length = 0
        for row in range(1, ws.max_row + 1):
            cell = ws.cell(row=row, column=col_idx)
            # Skip MergedCell objects (fixed the module path here)
            if isinstance(cell, openpyxl.cell.cell.MergedCell):
                continue
            try:
                cell_value = str(cell.value) if cell.value is not None else ""
                max_length = max(max_length, len(cell_value))
            except:
                pass
        column_widths[col_letter] = max_length + 2
        ws.column_dimensions[col_letter].width = column_widths[col_letter]

    # Save to bytes buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name=f'attendance_{company_id}_{month_name.replace(" ", "_")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    

@admin_bp.route('/delete_user', methods=['GET'])
def delete_user():
    if session.get('role') != 'company_admin':
        return redirect(url_for('login'))

    company_id = session.get('company_id')
    name = request.args.get('name', '').strip()  # Strip whitespace
    print(f'{company_id}{name}')

    if not name:
        flash("No user specified for deletion.", "error")
        return redirect(url_for('admin.dashboard'))

    # Check if the user exists in the company-specific table
    user_data = fetch_user_by_name_from_company_table(company_id, name)
    if not user_data:
        flash(f"User {name} not found in the company-specific table.", "error")
        return redirect(url_for('admin.dashboard'))

    try:
        # Delete from the company-specific table
        if not delete_user_from_company_table(company_id, name):
            flash(f"Error deleting user {name} from the company-specific table.", "error")
            return redirect(url_for('admin.dashboard'))

        # Remove user-related images
        
        # Remove temporary check-in images
        
        flash(f"User {name} deleted successfully.", "success")
        return redirect(url_for('admin.dashboard'))

    except Exception as e:
        logger.error(f"Error deleting user {name}: {str(e)}")
        flash(f"Error deleting user {name}: {str(e)}", "error")
        return redirect(url_for('admin.dashboard'))