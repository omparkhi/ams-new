from flask import Blueprint, render_template, request, redirect, session, url_for, flash
from datetime import datetime
import os
import sqlite3
import shutil
from app.utils.db_utils import get_db_connection, fetch_company_users , read_attendance_from_db , fetch_user_by_name_from_company_table,delete_user_from_company_table
from app.utils.performance_utils import measure_performance
from app.utils.attendance_utils import calculate_working_days
import traceback

from datetime import datetime, timedelta
from calendar import monthrange
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.utils import get_column_letter
from io import BytesIO
from flask import send_file
import logging


super_admin_bp = Blueprint('super_admin', __name__)


logger = logging.getLogger(__name__)
@measure_performance
@super_admin_bp.route('/dashboard', methods=['GET', 'POST'])
def super_admin():
    if 'username' not in session or session.get('role') != 'super_admin':
        return redirect(url_for('main.login'))

    if request.method == 'POST':
        if 'delete_id' in request.form:
            delete_id = request.form['delete_id']

            try:
                conn = get_db_connection()
                cursor = conn.cursor()

                print(f'{delete_id}')
                # Delete from companies table
                cursor.execute('DELETE FROM Companies WHERE "Company ID" = ?', (delete_id,))
                conn.commit()

                # Delete company-specific table (dynamically created based on company_id)
                cursor.execute(f"DROP TABLE IF EXISTS `{delete_id.replace(' ', '_')}`")
                conn.commit()

                # Delete related users from users table
                cursor.execute('DELETE FROM Users WHERE "Company ID" = ?', (delete_id,))
                conn.commit()

                # Remove company face encodings and 
                # directory
                encodings_file = f'face_encodings_{delete_id}.pkl'
                if os.path.exists(encodings_file):
                    os.remove(encodings_file)
                
                company_dir = os.path.join('path/to/images', delete_id)
                if os.path.exists(company_dir):
                    shutil.rmtree(company_dir)

                flash(f"Company {delete_id} and related data deleted successfully.", "success")
                conn.close()
            except sqlite3.Error as e:
                flash(f"Error occurred while deleting company: {e}", "error")

        else:
            # Form Data Processing
            company_name = request.form['company_name'].strip()
            company_username = request.form['company_username'].strip()
            company_password = request.form['company_password'].strip()
            check_in_time = request.form.get('check_in_time', '10:00').strip() + ':00'
            check_out_time = request.form.get('check_out_time', '18:30').strip() + ':00'
            required_hours = request.form.get('required_hours', '7.0').strip()

            print(f'{company_name} {company_username},{company_password}')
            try:
                # Validate time and required_hours input
                float(required_hours)
                datetime.strptime(check_in_time, '%H:%M:%S')
                datetime.strptime(check_out_time, '%H:%M:%S')
            except ValueError:
                flash("Invalid time format or required hours. Use HH:MM for times and a number for hours.", "error")
                return redirect(url_for('super_admin.super_admin'))

            company_id = company_name.replace(" ", "_") + "_01"  # Sanitize the company_id

            try:
                # Insert new company data into Companies table
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Companies ("Company ID", "Company Name", "Username", "Password")
                    VALUES (?, ?, ?, ?)
                """, (company_id, company_name, company_username, company_password))
                conn.commit()
                print("Company Created")
                # Create a company-specific table for attendance data
                cursor.execute(f"""
                    CREATE TABLE IF NOT EXISTS `{company_id}` (
                        Name TEXT
                    )
                """)
                conn.commit()

                flash(f"Company {company_name} added successfully.", "success")
                conn.close()
            except sqlite3.Error as e:
                flash(f"Error occurred while adding company: {e}", "error")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch companies data
        cursor.execute("SELECT * FROM Companies")
        companies = cursor.fetchall()

        users = {}
        for company in companies:
            company_id = company['Company ID']
            users[company_id] = fetch_company_users(company_id)  # Fetch company-specific users

        conn.close()
    except sqlite3.Error as e:
        flash(f"Error occurred while fetching data: {e}", "error")
        companies, users = [], {}

    return render_template('super_admin.html', companies=companies, users=users)

# @super_admin_bp.route('/dashboard', methods=['GET', 'POST'])
# def super_admin():
#     if 'username' not in session or session.get('role') != 'super_admin':
#         return redirect(url_for('main.login'))

#     if request.method == 'POST':
#         if 'delete_id' in request.form:
#             delete_id = request.form['delete_id']

#             try:
#                 conn = get_db_connection()
#                 cursor = conn.cursor()

#                 print(f"Deleting company with ID: {delete_id}")

#                 # Start a transaction to ensure consistency
#                 conn.begin()

#                 # Delete the company from the Companies table
#                 cursor.execute("DELETE FROM Companies WHERE company_id = ?", (delete_id,))
                
#                 # Delete company-specific table
#                 cursor.execute(f"DROP TABLE IF EXISTS `{delete_id.replace(' ', '_')}`")

#                 # Delete related users from Users table
#                 cursor.execute("DELETE FROM Users WHERE company_id = ?", (delete_id,))

#                 # Commit the transaction
#                 conn.commit()

#                 # Remove company face encodings and directory
#                 encodings_file = f'face_encodings_{delete_id}.pkl'
#                 if os.path.exists(encodings_file):
#                     os.remove(encodings_file)
                
#                 company_dir = os.path.join('path/to/images', delete_id)
#                 if os.path.exists(company_dir):
#                     shutil.rmtree(company_dir)

#                 flash(f"Company {delete_id} and related data deleted successfully.", "success")
#                 conn.close()

#             except sqlite3.Error as e:
#                 conn.rollback()  # Rollback transaction in case of error
#                 flash(f"Error occurred while deleting company: {e}", "error")
#                 conn.close()

#         else:
#             # Form Data Processing for adding a new company
#             company_name = request.form['company_name'].strip()
#             company_username = request.form['company_username'].strip()
#             company_password = request.form['company_password'].strip()
#             check_in_time = request.form.get('check_in_time', '10:00').strip() + ':00'
#             check_out_time = request.form.get('check_out_time', '18:30').strip() + ':00'
#             required_hours = request.form.get('required_hours', '7.0').strip()

#             try:
#                 # Validate time and required_hours input
#                 float(required_hours)
#                 datetime.strptime(check_in_time, '%H:%M:%S')
#                 datetime.strptime(check_out_time, '%H:%M:%S')
#             except ValueError:
#                 flash("Invalid time format or required hours. Use HH:MM for times and a number for hours.", "error")
#                 return redirect(url_for('super_admin.super_admin'))

#             company_id = company_name.replace(" ", "_")  # Sanitize the company_id

#             try:
#                 # Insert new company data into Companies table
#                 conn = get_db_connection()
#                 cursor = conn.cursor()
#                 cursor.execute("""
#                     INSERT INTO Companies (company_id, company_name, company_username, company_password, check_in_time, check_out_time, required_hours)
#                     VALUES (?, ?, ?, ?, ?, ?, ?)
#                 """, (company_id, company_name, company_username, company_password, check_in_time, check_out_time, required_hours))
#                 conn.commit()

#                 # Create a company-specific table for attendance data
#                 cursor.execute(f"""
#                     CREATE TABLE IF NOT EXISTS `{company_id}` (
#                         name TEXT,
#                         date TEXT,
#                         check_in_time TEXT,
#                         check_out_time TEXT,
#                         hours TEXT,
#                         status TEXT
#                     )
#                 """)
#                 conn.commit()

#                 flash(f"Company {company_name} added successfully.", "success")
#                 conn.close()
#             except sqlite3.Error as e:
#                 flash(f"Error occurred while adding company: {e}", "error")

#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()

#         # Fetch companies data
#         cursor.execute("SELECT * FROM Companies")
#         companies = cursor.fetchall()

#         users = {}
#         for company in companies:
#             company_id = company['company_id']
#             users[company_id] = fetch_company_users(company_id)  # Fetch company-specific users

#         conn.close()
#     except sqlite3.Error as e:
#         flash(f"Error occurred while fetching data: {e}", "error")
#         companies, users = [], {}

#     return render_template('super_admin.html', companies=companies, users=users)



# @super_admin.route('/get_overall_attendance', methods=['GET', 'POST'])
# def get_overall_attendance():
#     print("Received request for /get_overall_attendance")
#     print(f"Request method: {request.method}")
#     print(f"Session: {session}")

#     if session.get('role') != 'super_admin':
#         print("User is not super_admin, redirecting to login")
#         return redirect(url_for('login'))

#     if request.method == 'POST':
#         print("Processing POST request")
#         try:
#             duration = request.form.get('duration')
#             week_start = request.form.get('week_start')
#             specific_month = request.form.get('month')
#             six_month_start = request.form.get('six_month_start')
#             print(f"Form data: duration={duration}, week_start={week_start}, month={specific_month}, six_month_start={six_month_start}")

#             if not duration:
#                 flash('Please select a duration.', 'error')
#                 return render_template('super_admin.html')

#             # Normalize date format
#             def normalize_date(date_str):
#                 try:
#                     for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d']:
#                         try:
#                             dt = datetime.strptime(date_str, fmt)
#                             return dt.strftime('%d/%m/%Y')
#                         except ValueError:
#                             continue
#                     return None
#                 except Exception as e:
#                     print(f"Date normalization error for {date_str}: {str(e)}")
#                     return None

#             # Determine date range
#             working_days = []
#             period_name = ''
#             today = datetime.now()

#             if duration == 'weekly':
#                 if not week_start:
#                     flash('Please select a week start date.', 'error')
#                     return render_template('super_admin.html')
#                 try:
#                     week_start_dt = datetime.strptime(week_start, '%Y-%m-%d')
#                     week_end_dt = week_start_dt + timedelta(days=6)
#                     working_days = [(week_start_dt + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(7)]
#                     period_name = f"Week_{week_start_dt.strftime('%d-%m-%Y')}_to_{week_end_dt.strftime('%d-%m-%Y')}"
#                     print(f"Weekly working days: {working_days}")
#                 except ValueError:
#                     print(f"Invalid week_start: {week_start}")
#                     flash('Invalid week start date.', 'error')
#                     return render_template('super_admin.html')

#             elif duration == 'monthly':
#                 if specific_month:
#                     try:
#                         year, month = map(int, specific_month.split('-'))
#                     except ValueError:
#                         print(f"Invalid month: {specific_month}")
#                         flash('Invalid month format.', 'error')
#                         return render_template('super_admin.html')
#                 else:
#                     month, year = today.month, today.year
#                 working_days = calculate_working_days(year, month)
#                 period_name = f"Month_{datetime(year, month, 1).strftime('%B_%Y')}"
#                 print(f"Monthly working days: {working_days}")

#             elif duration == 'six_months':
#                 if six_month_start:
#                     try:
#                         start_year, start_month = map(int, six_month_start.split('-'))
#                     except ValueError:
#                         print(f"Invalid six_month_start: {six_month_start}")
#                         flash('Invalid six-month start month.', 'error')
#                         return render_template('super_admin.html')
#                 else:
#                     start_month = today.month - 5 if today.month > 5 else today.month - 5 + 12
#                     start_year = today.year - 1 if today.month <= 5 else today.year
#                 working_days = []
#                 for i in range(6):
#                     month = (start_month + i - 1) % 12 + 1
#                     year = start_year + (start_month + i - 1) // 12
#                     working_days.extend(calculate_working_days(year, month))
#                 period_name = f"Six_Months_{datetime(start_year, start_month, 1).strftime('%B_%Y')}_to_{datetime(year, month, 1).strftime('%B_%Y')}"
#                 print(f"Six-month working days: {working_days}")

#             # Fetch company data
#             result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:B'))
#             companies = result.get('values', []) if result else []
#             if not companies:
#                 print("No companies found")
#                 flash('No companies found.', 'error')
#                 return render_template('super_admin.html')
#             company_dict = {row[0]: row[1] for row in companies if len(row) >= 2}
#             print(f"Companies: {company_dict}")

#             # Fetch user data
#             user_result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Users!A2:B'))
#             users = user_result.get('values', []) if user_result else []
#             if not users:
#                 print("No users found")
#                 flash('No users found.', 'error')
#                 return render_template('super_admin.html')
#             user_dict = {company_id: [] for company_id in company_dict}
#             for user in users:
#                 if len(user) >= 2 and user[0] in user_dict:
#                     user_dict[user[0]].append(user[1])
#             print(f"Users: {user_dict}")

#             # Collect attendance data
#             attendance_data = {}
#             total_students = sum(len(names) for names in user_dict.values())
#             print(f"Total students: {total_students}")
#             for company_id in company_dict:
#                 attendance = read_attendance_from_db(company_id)
#                 if not attendance:
#                     print(f"No attendance for {company_id}")
#                     continue
#                 print(f"Raw attendance for {company_id}: {attendance[:5]}")
#                 for record in attendance:
#                     if len(record) < 3:
#                         print(f"Skipping invalid record: {record}")
#                         continue
#                     name = record[0]
#                     date_str = normalize_date(record[1]) if len(record) > 1 else None
#                     check_in = record[2] if len(record) > 2 else ''
#                     print(f"Processing: name={name}, date={date_str}, check_in={check_in}")
#                     if not date_str or date_str not in working_days:
#                         print(f"Date {date_str} not in working days or invalid")
#                         continue
#                     if name not in user_dict.get(company_id, []):
#                         print(f"User {name} not in user_dict for {company_id}")
#                         continue
#                     if company_id not in attendance_data:
#                         attendance_data[company_id] = {}
#                     if name not in attendance_data[company_id]:
#                         attendance_data[company_id][name] = {d: 'A' for d in working_days}
#                     if check_in and check_in.strip():
#                         attendance_data[company_id][name][date_str] = 'P'
#                         print(f"Marked {name} as Present on {date_str} due to check-in: {check_in}")
#                     else:
#                         attendance_data[company_id][name][date_str] = 'A'
#                         print(f"Marked {name} as Absent on {date_str} due to no check-in")
#                 print(f"Processed attendance for {company_id}: {attendance_data.get(company_id, {})}")

#             # Create Excel file
#             wb = Workbook()
#             ws = wb.active
#             ws.title = f"Attendance_{period_name}"

#             # Headers
#             headers = ['Company Name', 'Student Name'] + working_days + ['Total Days/Present']
#             ws.append(headers)

#             # Data rows
#             student_rows = []
#             for company_id, company_name in company_dict.items():
#                 for name in user_dict.get(company_id, []):
#                     row = [company_name, name]
#                     present_count = 0
#                     for day in working_days:
#                         status = attendance_data.get(company_id, {}).get(name, {}).get(day, 'A')
#                         row.append(status)
#                         if status == 'P':
#                             present_count += 1
#                     total_days = len(working_days)
#                     row.append(f"{total_days}/{present_count}")
#                     ws.append(row)
#                     student_rows.append(row)

#             # Add totals row for each date
#             totals_row = ['Total', '']
#             for day_idx, day in enumerate(working_days):
#                 present_on_day = sum(1 for row in student_rows if row[day_idx + 2] == 'P')
#                 totals_row.append(f"{present_on_day}/{total_students}")
#             totals_row.append('')
#             ws.append(totals_row)

#             # Styling
#             green_fill = PatternFill(start_color='00FF00', end_color='00FF00', fill_type='solid')
#             yellow_fill = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
#             white_font = Font(color='FFFFFF')
#             black_font = Font(color='000000')

#             for row in ws.iter_rows(min_row=2, max_row=ws.max_row-1, min_col=3, max_col=len(working_days)+2):
#                 for cell in row:
#                     if cell.value == 'P':
#                         cell.fill = green_fill
#                         cell.font = white_font
#                     elif cell.value == 'A':
#                         cell.fill = yellow_fill
#                         cell.font = black_font

#             for col in ws.iter_cols(min_row=1, max_row=1):
#                 for cell in col:
#                     cell.font = Font(bold=True)
#                     cell.alignment = Alignment(horizontal='center')
#             for cell in ws[ws.max_row]:
#                 cell.font = Font(bold=True)
#                 cell.alignment = Alignment(horizontal='center')

#             # Adjust column widths
#             for col_idx in range(1, ws.max_column + 1):
#                 col_letter = get_column_letter(col_idx)
#                 max_length = 0
#                 for cell in ws[f"{col_letter}"]:
#                     try:
#                         cell_value = str(cell.value) if cell.value else ''
#                         max_length = max(max_length, len(cell_value))
#                     except:
#                         pass
#                 ws.column_dimensions[col_letter].width = max_length + 2

#             # Save and send file
#             output = io.BytesIO()
#             wb.save(output)
#             output.seek(0)
#             print("Sending Excel file")
#             return send_file(
#                 output,
#                 as_attachment=True,
#                 download_name=f'attendance_{period_name}.xlsx',
#                 mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
#             )

#         except Exception as e:
#             print(f"Error in get_overall_attendance: {str(e)}")
#             flash(f'Error generating Excel: {str(e)}', 'error')
#             return render_template('super_admin.html')

#     print("Rendering super_admin.html for GET request")
#     return render_template('super_admin.html')



@super_admin_bp.route('/get_overall_attendance', methods=['GET', 'POST'])
def get_overall_attendance():
    print("Received request for /get_overall_attendance")

    if session.get('role') != 'super_admin':
        print("User not authorized. Redirecting to login.")
        return redirect(url_for('login'))

    if request.method == 'POST':
        try:
            duration = request.form.get('duration')
            week_start = request.form.get('week_start')
            specific_month = request.form.get('month')
            six_month_start = request.form.get('six_month_start')

            print(f"Form data: duration={duration}, week_start={week_start}, month={specific_month}, six_month_start={six_month_start}")

            if not duration:
                flash('Please select a duration.', 'error')
                return render_template('super_admin.html')

            today = datetime.now() + timedelta(hours=5, minutes=30)  # IST
            working_days = []
            period_name = ''

            if duration == 'weekly':
                if not week_start:
                    flash('Please select a week start date.', 'error')
                    return render_template('super_admin.html')
                week_start_dt = datetime.strptime(week_start, '%Y-%m-%d')
                week_end_dt = week_start_dt + timedelta(days=6)
                working_days = [(week_start_dt + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(7)]
                period_name = f"Week_{week_start_dt.strftime('%d-%m-%Y')}_to_{week_end_dt.strftime('%d-%m-%Y')}"

            elif duration == 'monthly':
                year, month = map(int, specific_month.split('-')) if specific_month else (today.year, today.month)
                working_days = calculate_working_days(year, month)
                period_name = f"Month_{datetime(year, month, 1).strftime('%B_%Y')}"

            elif duration == 'six_months':
                if six_month_start:
                    start_year, start_month = map(int, six_month_start.split('-'))
                else:
                    start_month = today.month - 5 if today.month > 6 else today.month - 5 + 12
                    start_year = today.year if today.month > 6 else today.year - 1

                for i in range(6):
                    month = (start_month + i - 1) % 12 + 1
                    year = start_year + (start_month + i - 1) // 12
                    working_days.extend(calculate_working_days(year, month))

                period_name = f"Six_Months_{datetime(start_year, start_month, 1).strftime('%B_%Y')}_to_{datetime(year, month, 1).strftime('%B_%Y')}"

            elif duration == 'today':
                today_str = today.strftime('%d/%m/%Y')
                working_days = [today_str]
                period_name = f"Today_{today.strftime('%d-%m-%Y')}"

            # Fetch companies and users
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute('SELECT "Company ID", "Company Name" FROM Companies')
            company_rows = cursor.fetchall()
            company_dict = {row["Company ID"]: row["Company Name"] for row in company_rows}

            cursor.execute('SELECT "Company ID", "User Name" FROM Users')
            user_rows = cursor.fetchall()

            user_dict = {cid: [] for cid in company_dict}
            for row in user_rows:
                user_dict[row["Company ID"]].append(row["User Name"])

            conn.close()

            attendance_data = {}
            total_students = 0
            cumulative_present = 0
            daily_present_counts = {date: 0 for date in working_days}

            for company_id in company_dict:
                raw_records = read_attendance_from_db(company_id)
                for record in raw_records:
                    record = dict(record)
                    name = record.get('Name')
                    if not name or name not in user_dict.get(company_id, []):
                        continue

                    daily_statuses = []
                    present_count = 0

                    for date in working_days:
                        col_key = f"{date} Attendance"
                        status_col = f"{date} Day Status"
                        status = 'A'
                        attendance_val = record.get(col_key, '').strip()

                        if ' - ' in attendance_val:
                            parts = attendance_val.split(' - ')
                            if len(parts) == 2:
                                time_in, time_out = parts[0].strip(), parts[1].strip()
                                if time_in and time_out:
                                    status = 'P'
                        else:
                            status = 'A'
                        if status == 'P':
                            present_count += 1
                            daily_present_counts[date] += 1
                        # elif status == 'H':
                        #     present_count += 1
                        #     daily_present_counts[date] += 1

                        attendance_data.setdefault(company_id, {}).setdefault(name, {})[date] = status

                    total_students += 1
                    cumulative_present += present_count

            # Generate Excel
            output = BytesIO()
            wb = Workbook()
            ws = wb.active
            ws.title = "Attendance Report"

            headers = ['Company', 'Student'] + working_days + ['Total Days/Present']
            ws.append(headers)

            header_font = Font(bold=True)
            for col_num in range(1, len(headers) + 1):
                cell = ws.cell(row=1, column=col_num)
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center")

            for company_id, students in attendance_data.items():
                company_name = company_dict.get(company_id, 'Unknown')
                for student_name, days in students.items():
                    daily_statuses = [days.get(d, 'A') for d in working_days]

                    total_present = sum(1 if s == 'P' else 1 if s == 'H' else 0 for s in daily_statuses)
                    total_days = len(working_days)
                    overallData = f'{total_present}/{total_days}'

                    row = [company_name, student_name] + daily_statuses + [overallData]
                    ws.append(row)

            ws.append([])  # Blank row

            # Summary row at the bottom
            summary_row = ['Total Students', total_students]
            for date in working_days:
                summary_row.append(f"{daily_present_counts[date]}/{total_students}")
            summary_row.append(f"{cumulative_present}/{total_students * len(working_days)}")

            ws.append(summary_row)
            ws.freeze_panes = 'A2'

            for col_num, _ in enumerate(headers, 1):
                col_letter = get_column_letter(col_num)
                max_length = max(len(str(cell.value)) if cell.value else 0 for cell in ws[col_letter])
                ws.column_dimensions[col_letter].width = max_length + 2

            wb.save(output)
            output.seek(0)

            print("Excel generated successfully.")
            return send_file(
                output,
                as_attachment=True,
                download_name=f'attendance_{period_name}.xlsx',
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )

        except Exception as e:
            print("Error in get_overall_attendance:")
            traceback.print_exc()
            flash(f'Error generating Excel: {e}', 'error')
            return render_template('super_admin.html')

    return render_template('super_admin.html')

@super_admin_bp.route('/get_todays_attendance', methods=['GET'])
def get_todays_attendance():
    print("Received request for /get_todays_attendance")

    if session.get('role') != 'super_admin':
        print("User not authorized. Redirecting to login.")
        return redirect(url_for('login'))

    try:
        today = datetime.now()  # Adjust for IST
  # Optionally adjust timezone
        
        today_str = today.strftime('%d/%m/%Y')
        period_name = f"Today_{today.strftime('%d-%m-%Y')}"
        working_days = [today_str]
        print(f"Today's working day: {working_days}")

        # Fetch companies and users
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT "Company ID", "Company Name" FROM Companies')
        company_rows = cursor.fetchall()
        company_dict = {row["Company ID"]: row["Company Name"] for row in company_rows}

        cursor.execute('SELECT "Company ID", "User Name" FROM Users')
        user_rows = cursor.fetchall()

        user_dict = {cid: [] for cid in company_dict}
        for row in user_rows:
            cid = row["Company ID"]
            uname = row["User Name"]
            if cid in user_dict:
                user_dict[cid].append(uname)

        conn.close()

        attendance_data = {}

        for company_id in company_dict:
            raw_records = read_attendance_from_db(company_id)
            for record in raw_records:
                record = dict(record)
                name = record.get('Name')
                if not name or name not in user_dict.get(company_id, []):
                    continue

                col_key = f"{today_str} Attendance"
                status_col = f"{today_str} Day Status"

                status = 'A'  # Default Absent
                if col_key in record:
                    time_in = record.get(col_key, '').strip()
                    day_status = record.get(status_col, '').strip()

                    if time_in or day_status in ['Half Day', 'Present']:
                        status = 'P' 

                attendance_data.setdefault(company_id, {}).setdefault(name, {})[today_str] = status

        # Generate Excel
        output = BytesIO()
        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance Report"
        headers = ['Company', 'Student', 'Check-In', 'Check-Out', 'Status', 'Total Days/Present']
        # headers = ['Company', 'Student'] + working_days + ['Total Days/Present']
        ws.append(headers)

        header_font = Font(bold=True)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")
        total_students = 0
        cumulative_present = 0
        total_days = 1
        for company_id, students in attendance_data.items():
            company_name = company_dict.get(company_id, 'Unknown')
            raw_records = read_attendance_from_db(company_id)
            raw_records_map = {dict(r)["Name"]: dict(r) for r in raw_records}
            for student_name, days in students.items():
                time_in = ''
                time_out = ''
                status = 'A'

                record = raw_records_map.get(student_name)
                if record:
                    col_key = f"{today_str} Attendance"
                    out_col_key = f"{today_str} Checkout"
                    status_col = f"{today_str} Day Status"
                    attendance_val = record.get(col_key, '').strip()
                    if ' - ' in attendance_val:
                        parts = attendance_val.split(' - ')
                        if len(parts) == 2:
                            time_in, time_out = parts[0].strip(), parts[1].strip()
                    elif attendance_val:
                        time_in = attendance_val.strip()
                    
                    day_status = record.get(status_col, '').strip()

                    if (time_in and time_out):
                        status = 'P'    
                        cumulative_present += 1

                overallData = f'{1 if status == "P" else 0}/{total_days}'
                row = [company_name, student_name, time_in, time_out, status, overallData]
                ws.append(row)

                total_students += 1

        summary_row = [
            "Total Students", 
            total_students, 
            "",
            "",
            f"{cumulative_present}/{total_students * total_days}"
            "",  # Leave the today's status column empty
        ]
        ws.append([])  # Blank row for separation
        ws.append(summary_row)
        ws.freeze_panes = 'A2'

        for col_num, _ in enumerate(headers, 1):
            max_length = max(len(str(cell.value)) if cell.value else 0 for cell in ws[get_column_letter(col_num)])
            ws.column_dimensions[get_column_letter(col_num)].width = max_length + 2

        wb.save(output)
        output.seek(0)

        print("Excel generated successfully for today's attendance.")
        return send_file(
            output,
            as_attachment=True,
            download_name=f'attendance_{period_name}.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except Exception as e:
        print("Error in get_todays_attendance:")
        traceback.print_exc()
        flash(f'Error generating Excel: {e}', 'error')
        return render_template('super_admin.html')


