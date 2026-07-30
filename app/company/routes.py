from flask import Blueprint, render_template, request, redirect, url_for, session, flash, send_file , jsonify
from datetime import datetime, timedelta
from app.utils.google import service  # Assuming service is in app/utils/google.py
from app.utils.attendance_utils import read_attendance_from_db, SHEET_ID  # Assuming attendance_utils.py contains these
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from io import BytesIO
import os
from googleapiclient.errors import HttpError
from app.utils.attendance_utils import logger
from openpyxl.formatting.rule import FormulaRule
from app.utils.attendance_utils import calculate_working_days, load_encodings , calculate_weekly_working_days , get_todays_attendance
import openpyxl  # Already imported to resolve previous NameError
from app.utils.helper import safe_api_call
import io
from PIL import Image
import sqlite3
from app.utils.db_utils import get_db_connection
import numpy as np
import face_recognition
import base64
from app.utils.face_utils import save_encodings
from app.utils.performance_utils import measure_performance


company_bp = Blueprint('company', __name__)


IMAGES_DIR = 'images'

# @company_bp.route('/combined_dashboard')
# @measure_performance
# def combined_dashboard():
#     if 'username' not in session or session.get('role') != 'super_admin':
#         return redirect(url_for('login'))

#     # Fetch companies
#     result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:D'))
#     companies_raw = result.get('values', [])
    
#     # Fetch users
#     user_result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Users!A2:B'))
#     users = {company[0]: [] for company in companies_raw}
#     for row in user_result.get('values', []):
#         if row and len(row) >= 2 and row[0] in users:  # Check if company ID exists
#             users[row[0]].append(row[1])
#         elif row and len(row) >= 2:
#             print(f"Warning: Skipping user row with invalid company ID {row[0]}")  # Debug log

#     # Calculate attendance stats
#     today = datetime.now().strftime('%d/%m/%Y')
#     companies_with_stats = []
#     for company in companies_raw:
#         company_id = company[0]
#         total_users = len(users.get(company_id, []))
#         attendance = read_attendance_from_db(company_id)
#         todays_attendance = [r for r in attendance if r[1] == today]
#         present_today = len([r for r in todays_attendance if r[4] == 'Present'])
#         absent_today = total_users - present_today
#         companies_with_stats.append({
#             0: company[0],  # Company ID
#             1: company[1],  # Company Name
#             'total_users': total_users,
#             'present_today': present_today,
#             'absent_today': absent_today
#         })

#     # Create a version of companies_with_stats with string keys for JSON serialization
#     company_stats_for_json = [
#         {
#             '0': company[0],
#             '1': company[1],
#             'total_users': company['total_users'],
#             'present_today': company['present_today'],
#             'absent_today': company['absent_today']
#         }
#         for company in companies_with_stats
#     ]

#     return render_template('combined_dashboard.html', companies=companies_with_stats, companyStats=company_stats_for_json)

# @company_bp.route('/combined_dashboard')
# @measure_performance
# def combined_dashboard():
#     if 'username' not in session or session.get('role') != 'super_admin':
#         return redirect(url_for('login'))

#     # Connect to SQLite DB
#     conn = get_db_connection()  # Assume this returns a SQLite connection
#     cursor = conn.cursor()

#     # Fetch companies
#     cursor.execute('SELECT "Company ID", "Company Name" FROM Companies')
#     companies_raw = cursor.fetchall()

#     # Fetch users grouped by company_id
#     cursor.execute('SELECT "Company ID", COUNT(*) FROM Users GROUP BY "Company ID"')
#     user_counts = {row[0]: row[1] for row in cursor.fetchall()}

#     # Fetch today's attendance
#     today = datetime.now().strftime('%d/%m/%Y')
#     # cursor.execute("""
#     #     SELECT u.company_id, a.status
#     #     FROM Attendance a
#     #     JOIN User u ON a.user_id = u.id
#     #     WHERE a.date = ?
#     # """, (today,))
    
#     # attendance_data = cursor.fetchall()
    
#     # Calculate present count per company
#     attendance_summary = {}
#     for company_id, status in attendance_data:
#         if company_id not in attendance_summary:
#             attendance_summary[company_id] = {'present': 0}
#         if status == 'Present':
#             attendance_summary[company_id]['present'] += 1

#     companies_with_stats = []
#     for company_id, company_name in companies_raw:
#         total_users = user_counts.get(company_id, 0)
#         try:
#             todays_attendance = get_todays_attendance(company_id, today)
#         except Exception as e:
#             logger.warning(f"Skipping attendance for {company_id} due to error: {e}")
#             todays_attendance = []
#         present_today = len([record for record in todays_attendance if record[4] == 'Present'])
#         absent_today = total_users - present_today

#         companies_with_stats.append({
#             0: company_id,
#             1: company_name,
#             'total_users': total_users,
#             'present_today': present_today,
#             'absent_today': absent_today
#         })

#     # JSON-serializable version
#     company_stats_for_json = [
#         {
#             '0': company[0],
#             '1': company[1],
#             'total_users': company['total_users'],
#             'present_today': company['present_today'],
#             'absent_today': company['absent_today']
#         }
#         for company in companies_with_stats
#     ]

#     return render_template('combined_dashboard.html', companies=companies_with_stats, companyStats=company_stats_for_json)

@company_bp.route('/combined_dashboard')
@measure_performance
def combined_dashboard():
    if 'username' not in session or session.get('role') != 'super_admin':
        return redirect(url_for('login'))

    conn = get_db_connection()
    cursor = conn.cursor()

    # Step 1: Fetch companies
    cursor.execute('SELECT "Company ID", "Company Name" FROM Companies')
    companies_raw = cursor.fetchall()

    # Step 2: Fetch user counts per company
    cursor.execute('SELECT "Company ID", COUNT(*) FROM Users GROUP BY "Company ID"')
    user_counts = {row[0]: row[1] for row in cursor.fetchall()}

    today = datetime.now().strftime('%d/%m/%Y')
    companies_with_stats = []

    # Step 3: For each company, fetch today's attendance using company-specific table
    for company_id, company_name in companies_raw:
        total_users = user_counts.get(company_id, 0)

        try:
            todays_attendance = get_todays_attendance(company_id, today)
        except Exception as e:
            logger.warning(f"Skipping attendance for {company_id} due to error: {e}")
            todays_attendance = []

        present_today = len([record for record in todays_attendance if record[4] == 'Present'])
        absent_today = total_users - present_today

        companies_with_stats.append({
            0: company_id,
            1: company_name,
            'total_users': total_users,
            'present_today': present_today,
            'absent_today': absent_today
        })

    company_stats_for_json = [
        {
            '0': company[0],
            '1': company[1],
            'total_users': company['total_users'],
            'present_today': company['present_today'],
            'absent_today': company['absent_today']
        }
        for company in companies_with_stats
    ]

    conn.close()
    return render_template('combined_dashboard.html', companies=companies_with_stats, companyStats=company_stats_for_json)

@company_bp.route('/company_dashboard/<company_id>')
def company_dashboard(company_id):
    if 'username' not in session or session.get('role') != 'super_admin':
        return redirect(url_for('main.login'))

    # Fetch company information (now including address, contact, and email)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT "Company Name", "Address", "Contact", "Email" FROM Companies WHERE "Company ID" = ?', (company_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return "Company not found", 404

    company_name = row[0]
    company_address = row[1] if row[1] else 'Unknown'
    company_contact = row[2] if row[2] else '-'
    company_email = row[3] if row[3] else 'unknown@company.com'
    # Get filter parameters
    filter_name = request.args.get('filter_name', '')
    filter_month = request.args.get('filter_month', '')
    filter_date = request.args.get('filter_date', '')
    filter_start_date = request.args.get('filter_start_date', '')
    filter_end_date = request.args.get('filter_end_date', '')

    # Fetch attendance records
    attendance = read_attendance_from_db(company_id)
    
    # Get unique user names
    users_list = sorted(list(set(record[0] for record in attendance)))

    # Define expected working days (e.g., last 30 days, excluding weekends)
    def get_working_days(start_date, end_date):
        working_days = []
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() < 5:
                working_days.append(current_date.strftime('%d/%m/%Y'))
            current_date += timedelta(days=1)
        return working_days

    # Set date range for expected working days (e.g., last 30 days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    working_days = get_working_days(start_date, end_date)

    # Get unique months for filter dropdown
    unique_dates = set(record[1] for record in attendance)
    available_months = []
    month_names = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December'
    }
    months_set = set()
    for date_str in unique_dates:
        try:
            month = date_str.split('/')[1]
            if month in month_names and month not in months_set:
                available_months.append({'name': month_names[month], 'value': month})
                months_set.add(month)
        except (IndexError, ValueError):
            continue
    available_months.sort(key=lambda x: x['value'])

    # Create a comprehensive attendance list with absent records
    comprehensive_attendance = []
    for user in users_list:
        user_records = [r for r in attendance if r[0] == user]
        user_dates = set(r[1] for r in user_records)
        
        # Add present records
        comprehensive_attendance.extend(user_records)
        
        # Add absent records for missing working days
        for date in working_days:
            if date not in user_dates:
                comprehensive_attendance.append([
                    user,  # record[0]: name
                    date,  # record[1]: date
                    '',    # record[2]: check_in (empty)
                    '',    # record[3]: check_out (empty)
                    'Absent',  # record[4]: status
                    '',    # record[5]: (assuming this is unused)
                    '0',   # record[6]: hours
                    'Absent'  # record[7]: day_status
                ])

    # Filter attendance records
    filtered_attendance = comprehensive_attendance
    if filter_name:
        filtered_attendance = [r for r in filtered_attendance if r[0] == filter_name]
    if filter_month:
        filtered_attendance = [r for r in filtered_attendance if r[1].split('/')[1] == filter_month]
    if filter_date:
        try:
            date_obj = datetime.strptime(filter_date, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%d/%m/%Y')
            filtered_attendance = [r for r in filtered_attendance if r[1] == formatted_date]
        except ValueError:
            filtered_attendance = []
    if filter_start_date and filter_end_date:
        try:
            start_date = datetime.strptime(filter_start_date, '%Y-%m-%d')
            end_date = datetime.strptime(filter_end_date, '%Y-%m-%d')
            formatted_start = start_date.strftime('%d/%m/%Y')
            formatted_end = end_date.strftime('%d/%m/%Y')
            filtered_attendance = [
                r for r in filtered_attendance
                if datetime.strptime(r[1], '%d/%m/%Y') >= start_date and datetime.strptime(r[1], '%d/%m/%Y') <= end_date
            ]
        except ValueError:
            filtered_attendance = []

    # Create attendance records for display
    attendance_records = [
        {
            'name': record[0],
            'date': record[1],
            'time_range': f"{record[2]} - {record[3]}" if record[2] and record[3] else (record[2] or record[3] or 'N/A'),
            'status': record[4],
            'hours': record[6] or 'N/A',
            'day_status': record[7] or 'N/A'
        } for record in filtered_attendance
    ]

    # Calculate attendance summaries for chart
    user_attendance_data = {}
    for user in users_list:
        user_records = [r for r in comprehensive_attendance if r[0] == user]
        present_days = len([r for r in user_records if r[4].lower() == 'present'])
        absent_days = len([r for r in user_records if r[4].lower() == 'absent'])
        leaves_taken = min(absent_days, 2)  # Assuming max 2 leaves allowed

        user_attendance_data[user] = {
            'present_days': present_days,
            'absent_days': absent_days,
            'leaves_taken': leaves_taken
        }

    return render_template(
        'company_dashboard.html',
        company_id=company_id,
        company_name=company_name,
        company_address=company_address,  # New variable
        company_contact=company_contact,  # New variable
        company_email=company_email,      # New variable
        attendance_records=attendance_records,
        users_list=users_list,
        user_attendance_data=user_attendance_data,
        available_months=available_months,
        filter_name=filter_name,
        filter_month=filter_month,
        filter_date=filter_date,
        filter_start_date=filter_start_date,
        filter_end_date=filter_end_date
    )



@company_bp.route('/download_company_attendance')
def download_company_attendance():
    if session.get('role') != 'super_admin':
        return redirect(url_for('login'))

    # Get company_id and month from query parameters
    company_id = request.args.get('company_id')
    selected_month = request.args.get('month')

    print(f'{selected_month}')

    if not company_id:
        flash("No company ID provided.", "error")
        return redirect(url_for('super_admin'))

    # Connect to the SQLite database and validate company_id exists
    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch company details from the database
    cursor.execute('SELECT * FROM Companies WHERE "Company ID" = ?', (company_id,))
    company = cursor.fetchone()
    
    if not company:
        flash("Invalid company ID.", "error")
        return redirect(url_for('super_admin'))
    
    company_name = company[1]  # Assuming the company name is in the second column of the 'companies' table
    conn.close()

    # Fetch attendance data for the company from the database
    attendance = read_attendance_from_db(company_id)
    all_names = list(load_encodings(company_id).keys())

    # Default to current month if not specified
    if not selected_month:
        selected_month = datetime.now().strftime('%m-%Y')
    
    try:
        print(f'Selected month: {selected_month}')
        year, month = map(int, selected_month.split('-'))
        month_name = datetime(year, month, 1).strftime('%B %Y')
        print(f'Month: {month}, Year: {year}, Month Name: {month_name}')
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
        for date_str in working_days:
            record = filtered_attendance[name].get(date_str, None)
            if record:
                _, _, in_time, out_time, _, _, _, _ = record
                in_time_str = in_time.split(':')[0] + ':' + in_time.split(':')[1] if in_time else '-'
                out_time_str = out_time.split(':')[0] + ':' + out_time.split(':')[1] if out_time else '-'
                
                # Mark as Present only if checkout time is available
                if out_time:  # Present if checkout time is available
                    overview = 'p'
                    present_count += 1
                else:  # Absent if no checkout time
                    overview = 'a'

                row_data.extend([overview, in_time_str, out_time_str])
            else:
                row_data.extend(['a', '-', '-'])  # Absent if no record

        # Calculate total days present: count of 'p' marks
        row_data.append(f"{present_count}")
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
        # Apply formatting for Absent (a) - red background, black text
        ws.conditional_formatting.add(
            f'{col_letter}3:{col_letter}{ws.max_row}',
            FormulaRule(
                formula=[f'${col_letter}3="a"'],
                stopIfTrue=True,
                fill=red_fill,
                font=black_font
            )
        )

    # Adjust column widths for better readability
    # Apply the column width adjustment for the "Name" column specifically
    for col_num, _ in enumerate(main_headers, start=1):
        if col_num == 1:  # This is the "Name" column
            # Manually adjust the width for the Name column based on the maximum length of the names
            max_len = max(len(str(cell.value)) for cell in ws[get_column_letter(col_num)]) if col_num != 1 else 20  # Default 20 for Name column
        else:
            # Calculate max length for all other columns
            max_len = max(len(str(cell.value)) for cell in ws[get_column_letter(col_num)]) if col_num != 1 else 0
        ws.column_dimensions[get_column_letter(col_num)].width = max_len + 2  # Add a little extra padding

    # Save the file and prepare it for download
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return send_file(output, as_attachment=True, download_name=f'{company_name}_attendance_{month_name}.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')



# @company_bp.route('/edit_company/<company_id>', methods=['GET', 'POST'])
# def edit_company(company_id):
#     if 'username' not in session or session.get('role') != 'super_admin':
#         return redirect(url_for('login'))

#     # Fetch all companies to find the one to edit
#     result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:G').execute()
#     companies = result.get('values', [])
    
#     # Find the company and its row index
#     row_index = None
#     company = None
#     for i, row in enumerate(companies, start=2):
#         if row[0] == company_id:
#             row_index = i
#             company = row
#             break
    
#     if not company:
#         flash("Company not found.", "error")
#         return redirect(url_for('super_admin'))

#     if request.method == 'POST':
#         # Get form data
#         company_name = request.form['company_name'].strip()
#         company_username = request.form['company_username'].strip()
#         company_password = request.form['company_password'].strip()
#         check_in_time = request.form.get('check_in_time', '').strip() + ':00'
#         check_out_time = request.form.get('check_out_time', '').strip() + ':00'
#         required_hours = request.form.get('required_hours', '').strip()

#         # Validate inputs
#         try:
#             float(required_hours)  # Validate required hours
#             datetime.strptime(check_in_time, '%H:%M:%S')
#             datetime.strptime(check_out_time, '%H:%M:%S')
#         except ValueError:
#             flash("Invalid time format or required hours. Use HH:MM for times and a number for hours.", "error")
#             return render_template('edit_company.html', company=company)

#         # Update the company in the Google Sheet
#         service.spreadsheets().values().update(
#             spreadsheetId=SHEET_ID,
#             range=f'Companies!A{row_index}:G{row_index}',
#             valueInputOption='RAW',
#             body={'values': [[company_id, company_name, company_username, company_password, check_in_time, check_out_time, required_hours]]}
#         ).execute()

#         flash("Company updated successfully.", "success")
#         return redirect(url_for('super_admin'))

#     # For GET request, render the edit form with current values
#     return render_template('edit_company.html', company=company)


@company_bp.route('/edit_company/<company_id>', methods=['GET', 'POST'])
def edit_company(company_id):
    if 'username' not in session or session.get('role') != 'super_admin':
        return redirect(url_for('main.login'))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM Companies WHERE "Company ID" = ?', (company_id,))
    row = cursor.fetchone()

    if not row:
        flash("Company not found.", "error")
        conn.close()
        return redirect(url_for('super_admin'))

    if request.method == 'POST':
        # Get form data
        company_name = request.form['company_name'].strip()
        company_username = request.form['company_username'].strip()
        company_password = request.form['company_password'].strip()
        check_in_time = request.form.get('check_in_time', '').strip() + ':00'
        check_out_time = request.form.get('check_out_time', '').strip() + ':00'
        required_hours = request.form.get('required_hours', '').strip()

        # Validate inputs
        try:
            float(required_hours)
            datetime.strptime(check_in_time, '%H:%M:%S')
            datetime.strptime(check_out_time, '%H:%M:%S')
        except ValueError:
            flash("Invalid time format or required hours. Use HH:MM for times and a number for hours.", "error")
            conn.close()
            return render_template('edit_company.html', company=row)
    

        # Update the record in SQLite
        cursor.execute('''
            UPDATE Companies
            SET "Company Name" = ?, "Username" = ?, "Password" = ?,
                "Check In Time" = ?, "Check Out Time" = ?, "Required Hours" = ?
            WHERE "Company ID" = ?
        ''', (
            company_name, company_username, company_password,
            check_in_time, check_out_time, required_hours,
            company_id
        ))
        conn.commit()
        conn.close()

        flash("Company updated successfully.", "success")
        return redirect(url_for('super_admin'))

    print(f'{row}')
    conn.close()
    return render_template('edit_company.html', company=row)


def calculate_six_month_working_days(start_month, start_year):
    """Calculate working days (Monday to Friday) for a 6-month period starting from the given month and year."""
    working_days = []
    for i in range(6):  # Loop over 6 months
        # Calculate the month and year for the current iteration
        year = start_year + (start_month + i - 1) // 12
        month = (start_month + i - 1) % 12 + 1
        first_day = datetime(year, month, 1)
        if month == 12:
            next_month = datetime(year + 1, 1, 1)
        else:
            next_month = datetime(year, month + 1, 1)
        last_day = (next_month - timedelta(days=1)).day

        # Collect working days for the current month
        for day in range(1, last_day + 1):
            current_day = datetime(year, month, day)
            if current_day.weekday() < 5:  # Monday to Friday
                working_days.append(current_day.strftime('%d/%m/%Y'))
    return working_days
# @company_bp.route('/download_company_attendance_six_months')
# def download_company_attendance_six_months():
#     return render_template('reset_password.html', company_name=company_name)
  
@company_bp.route('/download_company_attendance_weekly', methods=['GET', 'POST'])
def download_company_attendance_weekly():
    if session.get('role') != 'super_admin':
        return redirect(url_for('login'))

    company_id = request.args.get('company_id')
    week_start = request.args.get('week_start')

    if not company_id:
        flash("No company ID provided.", "error")
        return redirect(url_for('super_admin'))

    if not week_start:
        flash("No week start date provided. Please select a date.", "error")
        return redirect(url_for('super_admin'))

    # Fetch company name from the database
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT "Company ID", "Company Name" FROM Companies')
    company_rows = cursor.fetchall()
    company_dict = {row[0]: row[1] for row in company_rows}

    conn.close()

    company_name = company_dict.get(company_id, 'Unknown Company')

    # Fetch attendance records for the specified company using the read_attendance_from_db function
    attendance = read_attendance_from_db(company_id)
    all_names = list(set([record[0] for record in attendance]))  # Extract unique names from records

    try:
        week_start_date = week_start
        working_days = [(datetime.strptime(week_start_date, '%Y-%m-%d') + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(7)]

        week_start_dt = datetime.strptime(working_days[0], '%d/%m/%Y')
        week_end_dt = datetime.strptime(working_days[-1], '%d/%m/%Y')
        week_range = f"Week of {week_start_dt.strftime('%d-%m-%Y')} to {week_end_dt.strftime('%d-%m-%Y')}"
    except ValueError:
        flash("Invalid date format. Please select a valid date.", "error")
        return redirect(url_for('super_admin'))

    filtered_attendance = {}
    for name in all_names:
        filtered_attendance[name] = {}
    for record in attendance:
        name, date_str, in_time, out_time, status, expected_checkout, hours, day_status = record
        if date_str in working_days:
            filtered_attendance[name][date_str] = record

    # Create Excel file for attendance
    wb = Workbook()
    ws = wb.active
    ws.title = f"Attendance - {week_range}"

    main_headers = ['Name']
    for date in working_days:
        main_headers.extend([date, '', ''])  # Date, Overview, Check-in, Check-out
    main_headers.append(f"Total Days Present ({week_range})")
    ws.append(main_headers)

    sub_headers = ['']
    for _ in working_days:
        sub_headers.extend(['Overview', 'Check-in', 'Check-out'])  # Overview (p/h/a), Check-in, Check-out
    sub_headers.append('')
    ws.append(sub_headers)

    # Format header cells
    for idx, date in enumerate(working_days, start=1):
        start_col = idx * 3 - 1
        end_col = start_col + 2
        ws.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
        cell = ws.cell(row=1, column=start_col)
        cell.alignment = Alignment(horizontal='center')

    for col_num in range(1, len(main_headers) + 1):
        cell_row1 = ws.cell(row=1, column=col_num)
        cell_row2 = ws.cell(row=2, column=col_num)
        cell_row1.font = Font(bold=True)
        cell_row2.font = Font(bold=True)
        cell_row1.alignment = Alignment(horizontal='center')
        cell_row2.alignment = Alignment(horizontal='center')

    # Populate data for each user
    # for row_num, name in enumerate(all_names, start=3):
    #     row_data = [name]
    #     present_count = 0
    #     half_day_count = 0
    #     for date_str in working_days:
    #         record = filtered_attendance[name].get(date_str, None)
    #         if record:
    #             _, _, in_time, out_time, _, _, _, day_status = record
    #             # Format check-in and check-out times
    #             in_time_str = in_time.split(':')[0] + ':' + in_time.split(':')[1] if in_time else '-'
    #             out_time_str = out_time.split(':')[0] + ':' + out_time.split(':')[1] if out_time else '-'
                
    #             if day_status == 'Full Day':
    #                 overview = 'p'
    #                 present_count += 1
    #             elif day_status == 'Half Day':
    #                 overview = 'h'
    #                 half_day_count += 1
    #             else:
    #                 overview = 'a'
                
    #             row_data.extend([overview, in_time_str, out_time_str])
    #         else:
    #             row_data.extend(['a', '-', '-'])  # Default Absent if no record found

    #     # Calculate total days present (Full Day + Half Day/2)
    #     total_days = present_count + (half_day_count / 2)
    #     row_data.append(f"{total_days:.1f}")
    #     ws.append(row_data)
# Populate data for each user
    for row_num, name in enumerate(all_names, start=3):
        row_data = [name]
        present_count = 0
        half_day_count = 0
        for date_str in working_days:
            record = filtered_attendance[name].get(date_str, None)
            if record:
                _, _, in_time, out_time, _, _, _, day_status = record

                # Format check-in and check-out times
                in_time_str = in_time.split(':')[0] + ':' + in_time.split(':')[1] if in_time else '-'
                out_time_str = out_time.split(':')[0] + ':' + out_time.split(':')[1] if out_time else '-'

                # Check if both check-in and check-out times are available for marking present
                if in_time and out_time:
                    if day_status == 'Full Day':
                        overview = 'p'  # Mark as Present if both in and out times are available
                        present_count += 1
                    elif day_status == 'Half Day':
                        overview = 'h'  # Mark as Half Day
                        half_day_count += 1
                    else:
                        overview = 'a'  # Otherwise, mark as Absent
                else:
                    overview = 'a'  # Mark as Absent if out_time is missing

                # Add the overview, in_time, and out_time to the row data
                row_data.extend([overview, in_time_str, out_time_str])
            else:
                # Mark Absent if no record exists for that date
                row_data.extend(['a', '-', '-'])  # Default Absent if no record found

        # Calculate total days present (Full Day + Half Day/2)
        total_days = present_count + (half_day_count / 2)
        row_data.append(f"{total_days:.1f}")
        ws.append(row_data)

    # Apply conditional formatting
    green_fill = PatternFill(start_color='00FF00', end_color='00FF00', fill_type='solid')
    red_fill = PatternFill(start_color='FF0000', end_color='FF0000', fill_type='solid')
    yellow_fill = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
    white_font = Font(color='FFFFFF')
    black_font = Font(color='000000')

    for col_idx in range(2, len(working_days) * 3 + 2, 3):
        col_letter = get_column_letter(col_idx)

        # Ensure that the range starts at the correct row (from row 3 and onwards)
        start_row = 3
        end_row = ws.max_row  # This will be the last row where data is present

        if start_row <= end_row:
            # Apply conditional formatting based on the value in the cell
            # Apply formatting for "Present" status ("p")
            ws.conditional_formatting.add(
                f'{col_letter}{start_row}:{col_letter}{end_row}',  # Corrected range format
                FormulaRule(
                    formula=[f'${col_letter}{start_row}="p"'],
                    stopIfTrue=True,
                    fill=green_fill,
                    font=white_font
                )
            )

            # Apply formatting for "Half Day" status ("h")
            ws.conditional_formatting.add(
                f'{col_letter}{start_row}:{col_letter}{end_row}',
                FormulaRule(
                    formula=[f'${col_letter}{start_row}="h"'],
                    stopIfTrue=True,
                    fill=red_fill,
                    font=white_font
                )
            )

            # Apply formatting for "Absent" status ("a")
            ws.conditional_formatting.add(
                f'{col_letter}{start_row}:{col_letter}{end_row}',
                FormulaRule(
                    formula=[f'${col_letter}{start_row}="a"'],
                    stopIfTrue=True,
                    fill=yellow_fill,
                    font=black_font
                )
            )

    else:
        # If no rows are available for conditional formatting, skip
        print(f"No rows available for column {col_letter}")

    # Set column widths based on content length
    column_widths = {}
    for col_idx in range(1, ws.max_column + 1):
        col_letter = get_column_letter(col_idx)
        max_length = 0
        for row in range(1, ws.max_row + 1):
            cell = ws.cell(row=row, column=col_idx)
            if isinstance(cell, openpyxl.cell.cell.MergedCell):
                continue
            try:
                cell_value = str(cell.value) if cell.value is not None else ""
                max_length = max(max_length, len(cell_value))
            except:
                pass
        column_widths[col_letter] = max_length + 2
        ws.column_dimensions[col_letter].width = column_widths[col_letter]

    # Save the Excel file to a BytesIO object
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    # Return the file as an attachment
    return send_file(
        output,
        as_attachment=True,
        download_name=f'attendance_{company_id}_{week_range.replace(" ", "_")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

# @company_bp.route('/add_user', methods=['GET', 'POST'])
# def add_user():
#     if session.get('role') != 'company_admin':
#         return redirect(url_for('main.login'))

#     company_id = session.get('company_id')
#     if request.method == 'POST':
#         try:
#             if not request.is_json:
#                 return jsonify({'error': 'Invalid request. JSON data required.'}), 400

#             data = request.get_json()
#             name = data.get('name').strip()
#             images = data.get('images', [])

#             if not name:
#                 return jsonify({'error': 'Name is required.'}), 400
#             if not images:
#                 return jsonify({'error': 'No images provided.'}), 400

#             encodings = load_encodings(company_id)
#             if name in encodings:
#                 return jsonify({'error': 'User already registered. Try a different name.'}), 400

#             person_dir = os.path.join(IMAGES_DIR, company_id, name)
#             if not os.path.exists(person_dir):
#                 os.makedirs(person_dir)

#             known_face_encodings = []
#             image_paths = []  # Track image paths for deletion
#             image_count = 0
#             for image_data in images:
#                 try:
#                     if ',' in image_data:
#                         image_data = image_data.split(',')[1]
#                     image_bytes = base64.b64decode(image_data)
#                     image = Image.open(io.BytesIO(image_bytes))
#                     frame = np.array(image)
#                     if frame.shape[-1] == 4:
#                         frame = frame[:, :, :3]
#                     rgb_frame = frame
#                     face_locations = face_recognition.face_locations(rgb_frame)
#                     if len(face_locations) != 1:
#                         continue
#                     face_encoding = face_recognition.face_encodings(rgb_frame, face_locations)[0]
#                     if face_encoding.shape != (128,):
#                         continue
#                     known_face_encodings.append(face_encoding)
#                     image_count += 1
#                     image_path = os.path.join(person_dir, f'{name}_{image_count}.jpg')
#                     Image.fromarray(frame).save(image_path)
#                     image_paths.append(image_path)  # Store path for later deletion
#                     logger.debug(f"Saved image: {image_path}")
#                 except Exception as e:
#                     logger.error(f"Error processing image {image_count + 1}: {str(e)}")
#                     continue

#             if known_face_encodings:
#                 if len(known_face_encodings) < 5:
#                     return jsonify({'error': 'Insufficient face captures (less than 5). Try again with better lighting or more angles.'}), 400
#                 encodings[name] = known_face_encodings
#                 save_encodings(company_id, encodings)
#                 logger.info(f"Face encodings saved for user {name} in company {company_id}")

#                 # Delete temporary images
#                 for img_path in image_paths:
#                     try:
#                         if os.path.exists(img_path):
#                             os.remove(img_path)
#                             logger.debug(f"Deleted image: {img_path}")
#                         else:
#                             logger.warning(f"Image not found for deletion: {img_path}")
#                     except Exception as e:
#                         logger.error(f"Failed to delete image {img_path}: {str(e)}")
#                         # Continue to avoid affecting response

#                 # Append user to Users sheet
#                 safe_api_call(
#                     service.spreadsheets().values().append(
#                         spreadsheetId=SHEET_ID,
#                         range='Users!A2:B2',
#                         valueInputOption='RAW',
#                         body={'values': [[company_id, name]]}
#                     )
#                 )

#                 # Check if company sheet exists
#                 try:
#                     spreadsheet = safe_api_call(service.spreadsheets().get(spreadsheetId=SHEET_ID))
#                     sheet_exists = any(sheet['properties']['title'] == company_id for sheet in spreadsheet.get('sheets', []))
#                 except HttpError as e:
#                     logger.error(f"Error checking if sheet {company_id} exists: {str(e)}")
#                     return jsonify({'error': f'Failed to verify company sheet: {str(e)}'}), 500

#                 # Create company sheet if it doesn't exist
#                 if not sheet_exists:
#                     try:
#                         requests = [{
#                             'addSheet': {
#                                 'properties': {
#                                     'title': company_id,
#                                     'gridProperties': {'rowCount': 1000, 'columnCount': 20}
#                                 }
#                             }
#                         }]
#                         safe_api_call(service.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': requests}))
#                         # Initialize headers
#                         default_headers = ['Name', 'Date', 'Time Range', 'Status', 'Hours']
#                         safe_api_call(
#                             service.spreadsheets().values().update(
#                                 spreadsheetId=SHEET_ID,
#                                 range=f'{company_id}!A1:E1',
#                                 valueInputOption='RAW',
#                                 body={'values': [default_headers]}
#                             )
#                         )
#                     except HttpError as e:
#                         logger.error(f"Error creating sheet {company_id}: {str(e)}")
#                         return jsonify({'error': f'Failed to create company sheet: {str(e)}'}), 500

#                 # Update company-specific sheet
#                 try:
#                     headers = safe_api_call(
#                         service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=f'{company_id}!A1:1')
#                     ).get('values', [[]])[0] or ['Name']
#                     all_data = safe_api_call(
#                         service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=f'{company_id}!A2:B')
#                     ).get('values', [])
#                     all_data.append([name])
#                     safe_api_call(
#                         service.spreadsheets().values().update(
#                             spreadsheetId=SHEET_ID,
#                             range=f'{company_id}!A1',
#                             valueInputOption='RAW',
#                             body={'values': [headers]}
#                         )
#                     )
#                     if all_data:
#                         safe_api_call(
#                             service.spreadsheets().values().update(
#                                 spreadsheetId=SHEET_ID,
#                                 range=f'{company_id}!A2',
#                                 valueInputOption='RAW',
#                                 body={'values': all_data}
#                             )
#                         )
#                 except HttpError as e:
#                     logger.warning(f"Non-critical error updating company sheet {company_id}: {str(e)}")
#                     # Continue despite error, as user is already registered
#                     pass

#                 return jsonify({'success': f'User {name} registered successfully'}), 200
#             else:
#                 return jsonify({'error': 'No valid faces detected.'}), 400

#         except Exception as e:
#             logger.error(f"Error in add_user: {str(e)}")
#             return jsonify({'error': f'Error: {str(e)}'}), 500

#     return render_template('add_user.html', error=None)


@company_bp.route('/add_user', methods=['GET', 'POST'])
def add_user():
    if session.get('role') != 'company_admin':
        return redirect(url_for('main.login'))

    company_id = session.get('company_id')
    if request.method == 'POST':
        try:
            if not request.is_json:
                return jsonify({'error': 'Invalid request. JSON data required.'}), 400

            data = request.get_json()
            name = data.get('name').strip()
            images = data.get('images', [])

            if not name:
                return jsonify({'error': 'Name is required.'}), 400
            if not images:
                return jsonify({'error': 'No images provided.'}), 400

            # Load existing encodings for the company
            encodings = load_encodings(company_id)
            if name in encodings:
                return jsonify({'error': 'User already registered. Try a different name.'}), 400

            # Create directory for storing images if it doesn't exist
            person_dir = os.path.join(IMAGES_DIR, company_id, name)
            if not os.path.exists(person_dir):
                os.makedirs(person_dir)

            known_face_encodings = []
            image_paths = []  # Track image paths for deletion
            image_count = 0
            for image_data in images:
                try:
                    if ',' in image_data:
                        image_data = image_data.split(',')[1]
                    image_bytes = base64.b64decode(image_data)
                    image = Image.open(io.BytesIO(image_bytes))
                    frame = np.array(image)
                    if frame.shape[-1] == 4:
                        frame = frame[:, :, :3]
                    rgb_frame = frame
                    face_locations = face_recognition.face_locations(rgb_frame)
                    if len(face_locations) != 1:
                        continue
                    face_encoding = face_recognition.face_encodings(rgb_frame, face_locations)[0]
                    if face_encoding.shape != (128,):
                        continue
                    known_face_encodings.append(face_encoding)
                    image_count += 1
                    image_path = os.path.join(person_dir, f'{name}_{image_count}.jpg')
                    Image.fromarray(frame).save(image_path)
                    image_paths.append(image_path)  # Store path for later deletion
                    logger.debug(f"Saved image: {image_path}")
                except Exception as e:
                    logger.error(f"Error processing image {image_count + 1}: {str(e)}")
                    continue

            # Check if there are enough valid face encodings
            if known_face_encodings:
                if len(known_face_encodings) < 5:
                    return jsonify({'error': 'Insufficient face captures (less than 5). Try again with better lighting or more angles.'}), 400
                encodings[name] = known_face_encodings
                save_encodings(company_id, encodings)
                logger.info(f"Face encodings saved for user {name} in company {company_id}")

                # Insert the new user into the company's SQLite attendance table
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()

                    cursor.execute(f'''PRAGMA table_info({company_id})''')
                    cursor.execute(f'''PRAGMA table_info("{company_id}")''')
                    columns = cursor.fetchall()
                    logger.debug(f"Columns for {company_id} table: {columns}")
                    # Insert the new user into the company-specific table
                    cursor.execute(f'''
                        INSERT INTO "{company_id}" (Name)
                        VALUES (?)
                    ''', (name,))
                    # Insert into Users
                    # # 
                    cursor.execute(f'''PRAGMA table_info(Users)''')
                    #  table
                    cursor.execute('''
                        INSERT INTO Users ("Company ID", "User Name")
                        VALUES (?, ?)
                    ''', (company_id, name,))

                    conn.commit()
                    conn.close()
                    logger.info(f"Inserted user {name} into local DB table for company {company_id}")
                except sqlite3.Error as db_err:
                    logger.error(f"SQLite error inserting user {name} into {company_id} table: {str(db_err)}")

                # Delete temporary images after processing
                for img_path in image_paths:
                    try:
                        if os.path.exists(img_path):
                            os.remove(img_path)
                            logger.debug(f"Deleted image: {img_path}")
                        else:
                            logger.warning(f"Image not found for deletion: {img_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete image {img_path}: {str(e)}")

                return jsonify({'success': f'User {name} registered successfully'}), 200
            else:
                return jsonify({'error': 'No valid faces detected.'}), 400

        except Exception as e:
            logger.error(f"Error in add_user: {str(e)}")
            return jsonify({'error': f'Error: {str(e)}'}), 500

    return render_template('add_user.html', error=None)
