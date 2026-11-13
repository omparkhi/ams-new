# # # Admin-specific helpers
import os
# # import base64
# # from calendar import monthrange
import logging
# # from datetime import datetime, timedelta, time, date
# # import re
# # from app.utils.google import service, safe_api_call
from app.utils.face_utils import load_encodings, parse_time_range  # assuming you have these
# # from pytz import timezone
# # from functools import lru_cache


SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
IMAGES_DIR = 'images'
if os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
    TEMP_CHECKIN_IMAGES_DIR = "/tmp/temp_checkin_images"
else:
    TEMP_CHECKIN_IMAGES_DIR = "temp_checkin_images"

try:
    os.makedirs(TEMP_CHECKIN_IMAGES_DIR, exist_ok=True)
except Exception:
    pass
logger = logging.getLogger(__name__)
# # india_offset = timedelta(hours=5, minutes=30)


# # def _fetch_sheet(company_id, full_range='A1:Z'):
# #     return safe_api_call(service.spreadsheets().values().get(
# #         spreadsheetId=SHEET_ID,
# #         range=f'{company_id}!{full_range}'
# #     )).get('values', [])

# # def read_attendance_from_db(company_id):
# #     try:
# #         sheet_values = _fetch_sheet(company_id)
# #         if not sheet_values or sheet_values[0] == ['Name']:
# #             return []
# #         headers = sheet_values[0]
# #         attendance = []
# #         for row in sheet_values[1:]:
# #             name = row[0]
# #             for i in range(1, len(headers), 4):
# #                 if i + 3 >= len(headers):
# #                     break
# #                 date = headers[i].replace(' Attendance', '')
# #                 time_range = row[i] if i < len(row) else ''
# #                 expected_checkout = row[i + 1] if i + 1 < len(row) else ''
# #                 hours = row[i + 2] if i + 2 < len(row) else ''
# #                 day_status = row[i + 3] if i + 3 < len(row) else ''
# #                 if time_range:
# #                     in_time, out_time = parse_time_range(time_range)
# #                     status = 'Present' if in_time else 'Absent'
# #                     attendance.append([name, date, in_time, out_time, status, expected_checkout, hours, day_status])
# #         return attendance
# #     except Exception as e:
# #         logger.error(f"Error in read_attendance_from_db: {e}")
# #         return []

# # def calculate_hours(in_time, out_time):
# #     if not in_time or not out_time:
# #         return ''
# #     try:
# #         in_time_dt = datetime.strptime(in_time, '%H:%M:%S')
# #         out_time_dt = datetime.strptime(out_time, '%H:%M:%S')
# #         time_diff = out_time_dt - in_time_dt
# #         if time_diff.total_seconds() < 0:
# #             time_diff += timedelta(days=1)
# #         hours = time_diff.total_seconds() / 3600
# #         return f"{hours:.2f}"
# #     except ValueError:
# #         return ''

# # # def update_attendance_in_db(company_id, attendance):
# # #     try:
# # #         today = datetime.now().strftime('%d/%m/%Y')
# # #         headers = safe_api_call(service.spreadsheets().values().get(
# # #             spreadsheetId=SHEET_ID, range=f'{company_id}!A1:1')).get('values', [[]])[0]
        
# # #         if not headers or headers == ['Name']:
# # #             headers = ['Name']
# # #         else:
# # #             existing_dates = set()
# # #             for header in headers[1:]:
# # #                 if header.endswith(' Attendance'):
# # #                     existing_dates.add(header.replace(' Attendance', ''))
# # #             headers = ['Name']
# # #             for date in sorted(existing_dates):
# # #                 headers.extend([f"{date} Attendance", f"{date} Check-out", f"{date} Hours", f"{date} Day Status"])

# # #         for date in set(r[1] for r in attendance):
# # #             if date not in existing_dates:
# # #                 headers.extend([f"{date} Attendance", f"{date} Check-out", f"{date} Hours", f"{date} Day Status"])

# # #         if f"{today} Attendance" not in headers:
# # #             headers.extend([f"{today} Attendance", f"{today} Check-out", f"{today} Hours", f"{today} Day Status"])

# # #         all_names = list(load_encodings(company_id).keys())
# # #         updated_data = []
# # #         for name in all_names:
# # #             row = [name]
# # #             for i in range(1, len(headers), 4):
# # #                 date = headers[i].replace(' Attendance', '')
# # #                 time_range = ''
# # #                 check_out = ''
# # #                 hours = ''
# # #                 day_status = ''
# # #                 for record in attendance:
# # #                     if record[0] == name and record[1] == date:
# # #                         in_time = record[2] or ''
# # #                         out_time = record[3] or ''
# # #                         day_status = record[7] if len(record) > 7 else ''
# # #                         if in_time and out_time:
# # #                             time_range = f"{in_time} - {out_time}"
# # #                             hours = calculate_hours(in_time, out_time)
# # #                         elif in_time:
# # #                             time_range = in_time
# # #                         check_out = out_time
# # #                 row.extend([time_range, check_out, hours, day_status])
# # #             updated_data.append(row)

# # #         safe_api_call(service.spreadsheets().values().update(
# # #             spreadsheetId=SHEET_ID,
# # #             range=f'{company_id}!A1',
# # #             valueInputOption='RAW',
# # #             body={'values': [headers]}
# # #         ))
# # #         if updated_data:
# # #             safe_api_call(service.spreadsheets().values().update(
# # #                 spreadsheetId=SHEET_ID,
# # #                 range=f'{company_id}!A2',
# # #                 valueInputOption='RAW',
# # #                 body={'values': updated_data}
# # #             ))
# # #     except Exception as e:
# # #         logger.error(f"Error in update_attendance_in_db: {e}")
# # #         raise


# # # def update_attendance_in_db(company_id, attendance):
# # #     try:
# # #         today = datetime.now().strftime('%d/%m/%Y')

# # #         # Step 1: Read existing headers
# # #         sheet = safe_api_call(service.spreadsheets().values().get(
# # #             spreadsheetId=SHEET_ID,
# # #             range=f'{company_id}!A1:1'
# # #         ))
# # #         headers = sheet.get('values', [[]])[0]

# # #         if not headers or headers == ['Name']:
# # #             headers = ['Name']
# # #             existing_dates = set()
# # #         else:
# # #             existing_dates = {
# # #                 h.replace(' Attendance', '')
# # #                 for h in headers if h.endswith(' Attendance')
# # #             }
# # #             # Rebuild headers in proper order
# # #             headers = ['Name']
# # #             for date in sorted(existing_dates):
# # #                 headers.extend([
# # #                     f"{date} Attendance",
# # #                     f"{date} Check-out",
# # #                     f"{date} Hours",
# # #                     f"{date} Day Status"
# # #                 ])

# # #         # Step 2: Ensure today's date is included
# # #         all_dates = existing_dates | {r[1] for r in attendance}
# # #         if today not in all_dates:
# # #             all_dates.add(today)
# # #             headers.extend([
# # #                 f"{today} Attendance",
# # #                 f"{today} Check-out",
# # #                 f"{today} Hours",
# # #                 f"{today} Day Status"
# # #             ])

# # #         # Step 3: Build the data matrix for all employees
# # #         all_names = list(load_encodings(company_id).keys())
# # #         updated_data = []

# # #         for name in all_names:
# # #             row = [name]
# # #             for i in range(1, len(headers), 4):
# # #                 date = headers[i].replace(' Attendance', '')
# # #                 time_range, check_out, hours, day_status = '', '', '', ''

# # #                 # Match attendance record
# # #                 for record in attendance:
# # #                     if record[0] == name and record[1] == date:
# # #                         in_time = record[2] or ''
# # #                         out_time = record[3] or ''
# # #                         day_status = record[7] if len(record) > 7 else ''

# # #                         if in_time and out_time:
# # #                             time_range = f"{in_time} - {out_time}"
# # #                             hours = record[6] or calculate_hours(in_time, out_time)
# # #                             check_out = out_time
# # #                         elif in_time:
# # #                             time_range = in_time
# # #                             check_out = ''
# # #                         else:
# # #                             time_range = ''
# # #                             check_out = out_time or ''
# # #                         break

# # #                 row.extend([time_range, check_out, hours, day_status])
# # #             updated_data.append(row)

# # #         # Step 4: Write headers and data back to the sheet
# # #         safe_api_call(service.spreadsheets().values().update(
# # #             spreadsheetId=SHEET_ID,
# # #             range=f'{company_id}!A1',
# # #             valueInputOption='RAW',
# # #             body={'values': [headers]}
# # #         ))

# # #         if updated_data:
# # #             safe_api_call(service.spreadsheets().values().update(
# # #                 spreadsheetId=SHEET_ID,
# # #                 range=f'{company_id}!A2',
# # #                 valueInputOption='RAW',
# # #                 body={'values': updated_data}
# # #             ))

# # #     except Exception as e:
# # #         logger.error(f"Error in update_attendance_in_db: {e}")
# # #         raise


# # def update_attendance_in_db(company_id, attendance):
# #     try:
# #         today = datetime.now().strftime('%d/%m/%Y')

# #         # Step 1: Read existing headers
# #         sheet = safe_api_call(service.spreadsheets().values().get(
# #             spreadsheetId=SHEET_ID,
# #             range=f'{company_id}!A1:1'
# #         ))
# #         headers = sheet.get('values', [[]])[0]
# #         if not headers or headers == ['Name']:
# #             headers = ['Name']
# #             existing_dates = set()
# #         else:
# #             existing_dates = {
# #                 h.replace(' Attendance', '')
# #                 for h in headers if h.endswith(' Attendance')
# #             }

# #         # Step 2: Ensure today's date is included
# #         all_dates = existing_dates | {r[1] for r in attendance}
# #         headers = ['Name']
# #         for date in sorted(all_dates):
# #             headers.extend([
# #                 f"{date} Attendance",
# #                 f"{date} Check-out",
# #                 f"{date} Hours",
# #                 f"{date} Day Status"
# #             ])

# #         # Step 3: Build data
# #         all_names = sorted({r[0] for r in attendance})  # Use names from attendance
# #         updated_data = []

# #         for name in all_names:
# #             row = [name]
# #             for date in sorted(all_dates):
# #                 time_range, check_out, hours, day_status = '', '', '', ''
# #                 for record in attendance:
# #                     if record[0] == name and record[1] == date:
# #                         in_time = record[2] or ''
# #                         out_time = record[3] or ''
# #                         day_status = record[7] if len(record) > 7 else ''
# #                         if in_time and out_time:
# #                             time_range = f"{in_time} - {out_time}"
# #                             hours = record[6] or calculate_hours(in_time, out_time)
# #                             check_out = out_time
# #                         elif in_time:
# #                             time_range = in_time
# #                             check_out = ''
# #                         else:
# #                             check_out = out_time or ''
# #                         break
# #                 row.extend([time_range, check_out, hours, day_status])
# #             updated_data.append(row)

# #         # Step 4: Write headers
# #         safe_api_call(service.spreadsheets().values().update(
# #             spreadsheetId=SHEET_ID,
# #             range=f'{company_id}!A1',
# #             valueInputOption='RAW',
# #             body={'values': [headers]}
# #         ))

# #         # Clear old rows to prevent residual data
# #         safe_api_call(service.spreadsheets().values().clear(
# #             spreadsheetId=SHEET_ID,
# #             range=f'{company_id}!A2:Z1000'
# #         ))

# #         # Step 5: Write data
# #         if updated_data:
# #             safe_api_call(service.spreadsheets().values().update(
# #                 spreadsheetId=SHEET_ID,
# #                 range=f'{company_id}!A2',
# #                 valueInputOption='RAW',
# #                 body={'values': updated_data}
# #             ))

# #     except Exception as e:
# #         logger.error(f"Error in update_attendance_in_db: {e}")
# #         raise


# # def get_checkin_image_base64(company_id, name, date_str):
# #     print(f"Fetching check-in image for {company_id}, {name}, {date_str}")
# #     image_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{name}_{date_str.replace('/', '-')}.jpg")
# #     print(f"Image path: {image_path}")
# #     if os.path.exists(image_path):
# #         with open(image_path, "rb") as image_file:
# #             encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
# #             return f"data:image/jpeg;base64,{encoded_string}"
# #     return None
# # def get_company_times_from_db(company_id):
# #     try:
# #         result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:G').execute()
# #         companies = result.get('values', [])
# #         for company in companies:
# #             if company[0] == company_id:
# #                 # Validate time format (HH:MM or HH:MM:SS)
# #                 check_in = company[4] if len(company) > 4 and company[4] and re.match(r'^\d{2}:\d{2}(:\d{2})?$', company[4]) else None
# #                 check_out = company[5] if len(company) > 5 and company[5] and re.match(r'^\d{2}:\d{2}(:\d{2})?$', company[5]) else None
# #                 required_hours = float(company[6]) if len(company) > 6 and company[6] and company[6].replace('.', '', 1).isdigit() else None
# #                 if check_in and check_out and required_hours:
# #                     return check_in, check_out, required_hours
# #                 break
# #         logger.error(f"Company times not set for company_id: {company_id}")
# #         return None, None, None  # Return None values instead of redirect
# #     except Exception as e:
# #         logger.error(f"Error fetching company times: {e}")
# #         return None, None, None  # Return None values instead of redirect


# # def log_attendance(company_id, name, action):
# #     now = datetime.now() + india_offset
# #     date_str = now.strftime('%d/%m/%Y')
# #     time_str = now.strftime('%H:%M:%S')

# #     attendance = read_attendance_from_db(company_id)
# #     today_records = [r for r in attendance if r[0] == name and r[1] == date_str]

# #     if not today_records:
# #         if action == 'checkin':
# #             checkin_time = datetime.strptime(time_str, '%H:%M:%S').time() 
# #             checkin_dt = datetime.combine(datetime.today(), checkin_time) + india_offset
# #             time_10_00 = datetime.combine(datetime.today(), time(10, 0)) + india_offset
# #             time_10_30 = datetime.combine(datetime.today(), time(10, 30)) + india_offset
# #             time_11_00 = datetime.combine(datetime.today(), time(11, 0)) + india_offset
# #             day_status = 'Full Day'
# #             expected_checkout = '18:30:00'

# #             if time_10_00 <= checkin_dt < time_10_30:
# #                 expected_checkout = '18:30:00'
# #             elif time_10_30 <= checkin_dt <= time_11_00:
# #                 checkout_dt = checkin_dt + timedelta(hours=5)
# #                 expected_checkout = checkout_dt.strftime('%H:%M:%S')
# #             elif checkin_dt > time_11_00:
# #                 expected_checkout = '18:30:00'
# #                 day_status = 'Half Day'

# #             attendance.append([name, date_str, time_str, '', 'Present', expected_checkout, '', day_status])
# #             update_attendance_in_db(company_id, attendance)
# #             return True, expected_checkout, day_status
# #     else:
# #         last_record = today_records[-1]
# #         checkin_time = datetime.strptime(last_record[2], '%H:%M:%S') if last_record[2] else None
# #         checkout_time = datetime.strptime(last_record[3], '%H:%M:%S') if last_record[3] else None
# #         day_status = last_record[7] if len(last_record) > 7 else 'Full Day'

# #         if action == 'checkout' and checkin_time and not checkout_time:
# #             time_since_checkin = now - datetime.combine(date.today(), checkin_time.time()) 
# #             print(f"Time since check-in: {time_since_checkin}")
# #             expected_checkout = datetime.strptime(last_record[5], '%H:%M:%S') if last_record[5] else datetime.strptime('18:30:00', '%H:%M:%S')
# #             if time_since_checkin.total_seconds() < 0:
# #                 time_since_checkin += timedelta(days=1)
# #             if time_since_checkin >= timedelta(hours=4):
# #                 last_record[3] = time_str
# #                 last_record[4] = 'Present'
# #                 last_record[6] = calculate_hours(last_record[2], time_str)
# #                 update_attendance_in_db(company_id, attendance)
# #                 return True, last_record[6], day_status
# #             return False, last_record[5], day_status
# #         elif action == 'checkin' and not checkout_time:
# #             if not checkin_time:
# #                 last_record[2] = time_str
# #                 last_record[4] = 'Present'
# #                 checkin_dt = datetime.strptime(time_str, '%H:%M:%S') + india_offset
# #                 time_10_00 = datetime.combine(datetime.today(), time(10, 0)) + india_offset
# #                 time_10_30 = datetime.combine(datetime.today(), time(10, 30)) + india_offset
# #                 time_11_00 = datetime.combine(datetime.today(), time(11, 0)) + india_offset
# #                 day_status = 'Full Day'
# #                 expected_checkout = '18:30:00'

# #                 if time_10_00 <= checkin_dt < time_10_30:
# #                     expected_checkout = '18:30:00'
# #                 elif time_10_30 <= checkin_dt <= time_11_00:
# #                     expected_checkout = (checkin_dt + timedelta(hours=5)).strftime('%H:%M:%S')
# #                 elif checkin_dt > time_11_00:
# #                     expected_checkout = '18:30:00'
# #                     day_status = 'Half Day'

# #                 last_record[5] = expected_checkout
# #                 last_record[7] = day_status
# #                 update_attendance_in_db(company_id, attendance)
# #                 return True, expected_checkout, day_status
# #     return False, '', day_status





# # def calculate_working_days(year, month):
# #     """
# #     Calculate a list of working days (Monday to Friday) in a given month.
# #     Returns list of dates in 'dd/mm/YYYY' format.
# #     """
# #     num_days = monthrange(year, month)[1]  # e.g., (0, 31) for Jan → returns 31
# #     working_days = []

# #     for day in range(1, num_days + 1):
# #         current_day = datetime(year, month, day)
# #         if current_day.weekday() < 5:  # Monday (0) to Friday (4)
# #             working_days.append(current_day.strftime('%d/%m/%Y'))

# #     return working_days

# # def calculate_weekly_working_days(start_date):
# #     """Calculate the working days (Monday to Friday) for the week containing start_date."""
# #     # Find the Monday of the week (weekday 0 = Monday)
# #     start_date = datetime.strptime(start_date, '%Y-%m-%d')
# #     days_to_monday = start_date.weekday()  # 0 = Monday, 6 = Sunday
# #     monday = start_date - timedelta(days=days_to_monday)
    
# #     # Generate working days from Monday to Friday
# #     working_days = []
# #     for i in range(5):  # Monday to Friday
# #         current_day = monday + timedelta(days=i)
# #         working_days.append(current_day.strftime('%d/%m/%Y'))
# #     return working_days


# # def get_leave_balance_from_db(company_id, name, year_month):
# #     try:
# #         leave_result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Leaves!A2:F').execute()
# #         leave_records = leave_result.get('values', [])
# #         leaves_taken = 0
# #         for record in leave_records:
# #             if (len(record) >= 5 and record[0] == company_id and record[1] == name and 
# #                 record[2] == year_month and record[4]):
# #                 try:
# #                     leaves_taken = int(record[4])
# #                 except ValueError:
# #                     leaves_taken = 0
# #                 break
# #         # Default to 2 leaves allowed per month if not specified
# #         leaves_allowed = 2  # You can modify this to fetch from Companies sheet if needed
# #         return leaves_allowed, leaves_taken
# #     except Exception as e:
# #         logger.error(f"Error fetching leave balance: {e}")
# #         return 2, 0  # Default values
    



# import os
# import base64
# import logging
# import re
# from functools import lru_cache
# from datetime import datetime, timedelta, time, date
# from calendar import monthrange
# from app.utils.google import service, safe_api_call
# from app.utils.face_utils import load_encodings, parse_time_range  # assuming you have these
# from pytz import timezone
# from app.utils.export_utils import export_all_company_sheets_to_sqlite


# SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
# IMAGES_DIR = 'images'
# TEMP_CHECKIN_IMAGES_DIR = "temp_checkin_images"
# logger = logging.getLogger(__name__)
# india_offset = timedelta(hours=5, minutes=30)

# def _fetch_sheet(company_id, full_range='A1:Z'):
#     return safe_api_call(service.spreadsheets().values().get(
#         spreadsheetId=SHEET_ID,
#         range=f'{company_id}!{full_range}'
#     )).get('values', [])

# def read_attendance_from_db(company_id):
#     try:
#         sheet_values = _fetch_sheet(company_id)
#         if not sheet_values or sheet_values[0] == ['Name']:
#             return []

#         headers, attendance = sheet_values[0], []
#         for row in sheet_values[1:]:
#             name = row[0]
#             for i in range(1, len(headers), 4):
#                 if i + 3 >= len(headers):
#                     break
#                 date = headers[i].replace(' Attendance', '')
#                 time_range = row[i] if i < len(row) else ''
#                 expected_checkout = row[i + 1] if i + 1 < len(row) else ''
#                 hours = row[i + 2] if i + 2 < len(row) else ''
#                 day_status = row[i + 3] if i + 3 < len(row) else ''
#                 if time_range:
#                     in_time, out_time = parse_time_range(time_range)
#                     status = 'Present' if in_time else 'Absent'
#                     attendance.append([name, date, in_time, out_time, status, expected_checkout, hours, day_status])
#         export_all_company_sheets_to_sqlite("sqlite_exports/attendance_data.db")

#         return attendance
#     except Exception as e:
#         logger.error(f"Error in read_attendance_from_db: {e}")
#         return []

# def calculate_hours(in_time, out_time):
#     try:
#         t1 = datetime.strptime(in_time, '%H:%M:%S')
#         t2 = datetime.strptime(out_time, '%H:%M:%S')
#         diff = (t2 - t1).total_seconds()
#         if diff < 0:
#             diff += 86400
#         return f"{diff / 3600:.2f}"
#     except Exception:
#         return ''

# def update_attendance_in_db(company_id, attendance):
#     try:
#         today = datetime.now().strftime('%d/%m/%Y')
#         headers = _fetch_sheet(company_id, 'A1:1')[0] if _fetch_sheet(company_id, 'A1:1') else ['Name']
#         existing_dates = {h.replace(' Attendance', '') for h in headers if h.endswith(' Attendance')}
#         all_dates = existing_dates | {r[1] for r in attendance}

#         headers = ['Name'] + [f"{date} {label}" for date in sorted(all_dates) for label in ['Attendance', 'Check-out', 'Hours', 'Day Status']]
#         name_date_map = {(r[0], r[1]): r for r in attendance}
#         all_names = sorted({r[0] for r in attendance})

#         updated_data = []
#         for name in all_names:
#             row = [name]
#             for date in sorted(all_dates):
#                 record = name_date_map.get((name, date))
#                 if record:
#                     in_time, out_time = record[2], record[3]
#                     hours = record[6] or calculate_hours(in_time, out_time)
#                     time_range = f"{in_time} - {out_time}" if in_time and out_time else in_time or ''
#                     row.extend([time_range, out_time or '', hours, record[7]])
#                 else:
#                     row.extend(['', '', '', ''])
#             updated_data.append(row)

#         safe_api_call(service.spreadsheets().values().update(
#             spreadsheetId=SHEET_ID,
#             range=f'{company_id}!A1',
#             valueInputOption='RAW',
#             body={'values': [headers]}
#         ))

#         safe_api_call(service.spreadsheets().values().clear(
#             spreadsheetId=SHEET_ID,
#             range=f'{company_id}!A2:Z1000'
#         ))

#         if updated_data:
#             safe_api_call(service.spreadsheets().values().update(
#                 spreadsheetId=SHEET_ID,
#                 range=f'{company_id}!A2',
#                 valueInputOption='RAW',
#                 body={'values': updated_data}
#             ))
#     except Exception as e:
#         logger.error(f"Error in update_attendance_in_db: {e}")

# def log_attendance(company_id, name, action):
#     now = datetime.now() + india_offset
#     date_str = now.strftime('%d/%m/%Y')
#     time_str = now.strftime('%H:%M:%S')

#     attendance = read_attendance_from_db(company_id)
#     today_records = [r for r in attendance if r[0] == name and r[1] == date_str]

#     def determine_checkout_and_status(checkin_dt):
#         time_10 = datetime.combine(date.today(), time(10)) + india_offset
#         time_10_30 = datetime.combine(date.today(), time(10, 30)) + india_offset
#         time_11 = datetime.combine(date.today(), time(11)) + india_offset

#         if time_10 <= checkin_dt < time_10_30:
#             return '18:30:00', 'Full Day'
#         elif time_10_30 <= checkin_dt <= time_11:
#             return (checkin_dt + timedelta(hours=5)).strftime('%H:%M:%S'), 'Full Day'
#         return '18:30:00', 'Half Day'

#     if not today_records:
#         if action == 'checkin':
#             checkin_dt = datetime.combine(datetime.today(), datetime.strptime(time_str, '%H:%M:%S').time()) + india_offset
#             expected_checkout, day_status = determine_checkout_and_status(checkin_dt)
#             attendance.append([name, date_str, time_str, '', 'Present', expected_checkout, '', day_status])
#             update_attendance_in_db(company_id, attendance)
#             return True, expected_checkout, day_status
#     else:
#         last = today_records[-1]
#         if action == 'checkout' and last[2] and not last[3]:
#             delta = now - datetime.combine(date.today(), datetime.strptime(last[2], '%H:%M:%S').time())
#             if delta.total_seconds() < 0:
#                 delta += timedelta(days=1)
#             if delta >= timedelta(hours=4):
#                 last[3] = time_str
#                 last[6] = calculate_hours(last[2], time_str)
#                 update_attendance_in_db(company_id, attendance)
#                 return True, last[6], last[7]
#         elif action == 'checkin' and not last[2]:
#             last[2] = time_str
#             checkin_dt = datetime.combine(datetime.today(), datetime.strptime(time_str, '%H:%M:%S').time()) + india_offset
#             last[5], last[7] = determine_checkout_and_status(checkin_dt)
#             update_attendance_in_db(company_id, attendance)
#             return True, last[5], last[7]
#     return False, '', last[7] if today_records else 'Full Day'

# @lru_cache(maxsize=128)
# def get_checkin_image_base64(company_id, name, date_str):
#     path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{name}_{date_str.replace('/', '-')}.jpg")
#     if os.path.exists(path):
#         with open(path, "rb") as f:
#             return f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"
#     return None

# def get_company_times_from_db(company_id):
#     try:
#         companies = safe_api_call(service.spreadsheets().values().get(
#             spreadsheetId=SHEET_ID,
#             range='Companies!A2:G'
#         )).get('values', [])
#         for c in companies:
#             if c[0] == company_id:
#                 ci, co, rh = c[4:7] if len(c) >= 7 else (None, None, None)
#                 if re.match(r'^\d{2}:\d{2}(:\d{2})?$', ci or '') and re.match(r'^\d{2}:\d{2}(:\d{2})?$', co or ''):
#                     return ci, co, float(rh) if rh and rh.replace('.', '', 1).isdigit() else None
#     except Exception as e:
#         logger.error(f"Error in get_company_times_from_db: {e}")
#     return None, None, None

# def calculate_working_days(year, month):
#     return [datetime(year, month, d).strftime('%d/%m/%Y')
#             for d in range(1, monthrange(year, month)[1] + 1)
#             if datetime(year, month, d).weekday() < 5]

# def calculate_weekly_working_days(start_date):
#     d = datetime.strptime(start_date, '%Y-%m-%d')
#     monday = d - timedelta(days=d.weekday())
#     return [(monday + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(5)]

# def get_leave_balance_from_db(company_id, name, ym):
#     try:
#         rows = safe_api_call(service.spreadsheets().values().get(
#             spreadsheetId=SHEET_ID, range='Leaves!A2:F')).get('values', [])
#         for r in rows:
#             if len(r) >= 5 and r[0] == company_id and r[1] == name and r[2] == ym:
#                 try:
#                     return 2, int(r[4])
#                 except: break
#         return 2, 0
#     except Exception as e:
#         logger.error(f"Error in get_leave_balance_from_db: {e}")
#         return 2, 0
    

# def generate_company_id(company_name):
#     result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:A'))
#     existing_ids = result.get('values', [])
#     filtered = [cid[0] for cid in existing_ids if cid and cid[0].startswith(company_name + "_")]
#     if not filtered:
#         return f"{company_name}_01"
#     suffixes = [int(cid.split("_")[1]) for cid in filtered if len(cid.split("_")) == 2 and cid.split("_")[1].isdigit()]
#     max_suffix = max(suffixes) if suffixes else 0
#     return f"{company_name}_{str(max_suffix + 1).zfill(2)}"


# def get_sheet_id(sheet_title):
#     spreadsheet = safe_api_call(service.spreadsheets().get(spreadsheetId=SHEET_ID))
#     sheets = spreadsheet.get('sheets', [])
#     for sheet in sheets:
#         if sheet.get('properties', {}).get('title') == sheet_title:
#             return sheet.get('properties', {}).get('sheetId')
#     return None



import os
import sqlite3
import logging
from datetime import datetime, timedelta, time, date
from calendar import monthrange
from functools import lru_cache
from app.utils.performance_utils import measure_performance

logger = logging.getLogger(__name__)

# Adjust this path as needed
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB_PATH = os.path.join(BASE_DIR, "sqlite_exports", "attendance_data.db")

india_offset = timedelta(hours=5, minutes=30)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn


def parse_time_range(time_range):
    """
    Parse time range string 'HH:MM:SS - HH:MM:SS' into (in_time, out_time).
    Return empty strings if not parsable.
    """
    try:
        parts = time_range.split(" - ")
        in_time = parts[0].strip() if len(parts) > 0 else ''
        out_time = parts[1].strip() if len(parts) > 1 else ''
        return in_time, out_time
    except Exception:
        return '', ''

@measure_performance
def read_attendance_from_db(company_id):
    company_id = company_id.replace(" ", "_")  # Ensure no spaces in table name

    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Assuming the table for company attendance is named exactly like company_id
        cursor.execute(f"SELECT * FROM '{company_id}'")
        rows = cursor.fetchall()

        if not rows:
            return []

        columns = [desc[0] for desc in cursor.description]

        attendance = []
        for row in rows:
            row_dict = dict(row)
            name = row_dict.get('Name') or row[0]

            # Process attendance data in groups of 4 columns starting after 'Name'
            for i in range(1, len(columns), 4):
                if i + 3 >= len(columns):
                    break
                date = columns[i].replace(' Attendance', '')
                time_range = row_dict.get(columns[i], '')
                expected_checkout = row_dict.get(columns[i + 1], '')
                hours = row_dict.get(columns[i + 2], '')
                day_status = row_dict.get(columns[i + 3], '')

                if time_range:
                    in_time, out_time = parse_time_range(time_range)
                    status = 'Present' if in_time else 'Absent'
                    attendance.append([name, date, in_time, out_time, status, expected_checkout, hours, day_status])

        conn.close()
        return attendance

    except Exception as e:
        logger.error(f"Error in read_attendance_from_db: {e}")
        return []


def calculate_hours(in_time, out_time):
    try:
        t1 = datetime.strptime(in_time, '%H:%M:%S')
        t2 = datetime.strptime(out_time, '%H:%M:%S')
        diff = (t2 - t1).total_seconds()
        if diff < 0:
            diff += 86400
        return f"{diff / 3600:.2f}"
    except Exception:
        return ''

def get_todays_attendance(company_id, target_date):
    """
    Fetch attendance data for a specific company and a specific date.
    
    :param company_id: str - ID of the company (used to determine table name)
    :param target_date: str - Date in 'dd/mm/yyyy' format
    :return: List of attendance records for that date
    """
    company_table = company_id.replace(" ", "_")
    attendance_records = []

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM '{company_table}'")
        rows = cursor.fetchall()
        if not rows:
            return []

        columns = [desc[0] for desc in cursor.description]
        # Map to find starting index of target_date
        date_col_prefix = f"{target_date} Attendance"
        try:
            date_index = columns.index(date_col_prefix)
        except ValueError:
            # Date column not found
            return []

        for row in rows:
            row_dict = dict(row)
            name = row_dict.get('Name') or row[0]

            time_range = row_dict.get(columns[date_index], '')
            expected_checkout = row_dict.get(columns[date_index + 1], '')
            hours = row_dict.get(columns[date_index + 2], '')
            day_status = row_dict.get(columns[date_index + 3], '')

            if time_range:
                in_time, out_time = parse_time_range(time_range)
                status = 'Present' if in_time else 'Absent'

                attendance_records.append([
                    name,
                    target_date,
                    in_time,
                    out_time,
                    status,
                    expected_checkout,
                    hours,
                    day_status
                ])

        return attendance_records

    except Exception as e:
        logger.error(f"[get_attendance_by_date] Error for company '{company_id}' on date '{target_date}': {e}")
        return []

    finally:
        if conn:
            conn.close()



# def update_attendance_in_db(company_id, attendance):
#     """
#     Update the attendance table with new data.
#     `attendance` is a list of rows, each row is a list of cell values including 'Name' + 4 columns per date.
#     This function replaces all existing data in the table for that company.
#     """

#     company_id = company_id.replace(" ", "_")  # Ensure no spaces in table name

#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()

#         # We need to generate headers dynamically:
#         # All unique dates from attendance
#         dates = sorted(set(r[1] for r in attendance))
#         # Build headers: Name + for each date 4 columns
#         headers = ['Name']
#         for d in dates:
#             headers.extend([f"{d} Attendance", f"{d} Check-out", f"{d} Hours", f"{d} Day Status"])

#         # Prepare a dict to map (name, date) -> attendance record
#         att_map = {}
#         for r in attendance:
#             att_map[(r[0], r[1])] = r

#         # Get all unique names
#         names = sorted(set(r[0] for r in attendance))

#         # Build data rows corresponding to headers
#         data_rows = []
#         for name in names:
#             row = [name]
#             for d in dates:
#                 rec = att_map.get((name, d))
#                 if rec:
#                     in_time, out_time = rec[2], rec[3]
#                     time_range = f"{in_time} - {out_time}" if in_time and out_time else in_time or ''
#                     row.extend([
#                         time_range,
#                         rec[5] or '',
#                         rec[6] or '',
#                         rec[7] or ''
#                     ])
#                 else:
#                     row.extend(['', '', '', ''])
#             data_rows.append(row)

#         # Delete old data
#         cursor.execute(f"DELETE FROM '{company_id}'")

#         # Insert new data
#         placeholders = ",".join("?" for _ in headers)
#         # insert_sql = f"INSERT INTO '{company_id}' ({','.join(headers)}) VALUES ({placeholders})"
#         quoted_headers = [f'"{h}"' for h in headers]  # Properly quote each header
#         insert_sql = f"INSERT INTO '{company_id}' ({','.join(quoted_headers)}) VALUES ({placeholders})"

#         cursor.executemany(insert_sql, data_rows)

#         conn.commit()
#         conn.close()

#     except Exception as e:
#         logger.error(f"Error in update_attendance_in_db: {e}")

@measure_performance
def update_attendance_in_db(company_id, attendance):
    """
    Update the attendance table with new data.
    `attendance` is a list of rows, each row is a list of cell values including 'Name' + 4 columns per date.
    This function replaces all existing data in the table for that company.
    """
    print(f'user update {attendance}')
    company_id = company_id.replace(" ", "_")  # Ensure no spaces in table name

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # We need to generate headers dynamically:
        # All unique dates from attendance
        dates = sorted(set(r[1] for r in attendance))
        # Build headers: Name + for each date 4 columns
        headers = ['Name']
        for d in dates:
            headers.extend([f"{d} Attendance", f"{d} Check-out", f"{d} Hours", f"{d} Day Status"])

        # Prepare a dict to map (name, date) -> attendance record
        att_map = {}
        for r in attendance:
            att_map[(r[0], r[1])] = r

        # Get all unique names
        names = sorted(set(r[0] for r in attendance))

        # Check and Add Columns for Each Date (if needed)
        for d in dates:
            # Check if the column for the given date exists in the table
            cursor.execute(f"PRAGMA table_info('{company_id}')")
            columns = [col[1] for col in cursor.fetchall()]
            
            # Add columns dynamically if they don't exist
            if f"{d} Attendance" not in columns:
                cursor.execute(f"ALTER TABLE '{company_id}' ADD COLUMN '{d} Attendance' TEXT")
            if f"{d} Check-out" not in columns:
                cursor.execute(f"ALTER TABLE '{company_id}' ADD COLUMN '{d} Check-out' TEXT")
            if f"{d} Hours" not in columns:
                cursor.execute(f"ALTER TABLE '{company_id}' ADD COLUMN '{d} Hours' TEXT")
            if f"{d} Day Status" not in columns:
                cursor.execute(f"ALTER TABLE '{company_id}' ADD COLUMN '{d} Day Status' TEXT")

        # Build data rows corresponding to headers
        data_rows = []
        for name in names:
            row = [name]
            for d in dates:
                rec = att_map.get((name, d))
                if rec:
                    in_time, out_time = rec[2], rec[3]
                    time_range = f"{in_time} - {out_time}" if in_time and out_time else in_time or ''
                    row.extend([
                        time_range,
                        rec[5] or '',
                        rec[6] or '',
                        rec[7] or ''
                    ])
                else:
                    row.extend(['', '', '', ''])
            data_rows.append(row)

        # Delete old data (if any)
        cursor.execute(f"DELETE FROM '{company_id}'")

        # Insert new data
        placeholders = ",".join("?" for _ in headers)
        quoted_headers = [f'"{h}"' for h in headers]  # Properly quote each header
        insert_sql = f"INSERT INTO '{company_id}' ({','.join(quoted_headers)}) VALUES ({placeholders})"

        cursor.executemany(insert_sql, data_rows)

        conn.commit()
        conn.close()

    except Exception as e:
        logger.error(f"Error in update_attendance_in_db: {e}")


@measure_performance
def log_attendance(company_id, name, action):
    now = datetime.now() + india_offset
    date_str = now.strftime('%d/%m/%Y')
    time_str = now.strftime('%H:%M:%S')

    attendance = read_attendance_from_db(company_id)
    today_records = [r for r in attendance if r[0] == name and r[1] == date_str]

    def determine_checkout_and_status(checkin_dt):
        time_10 = datetime.combine(date.today(), time(8)) + india_offset
        time_10_30 = datetime.combine(date.today(), time(10, 30)) + india_offset
        time_11 = datetime.combine(date.today(), time(11)) + india_offset

        if time_10 <= checkin_dt < time_10_30:
            return '18:30:00', 'Full Day'
        elif time_10_30 <= checkin_dt <= time_11:
            return (checkin_dt + timedelta(hours=5)).strftime('%H:%M:%S'), 'Full Day'
        return '18:30:00', 'Half Day'

    if not today_records:
        if action == 'checkin':
            checkin_dt = datetime.combine(datetime.today(), datetime.strptime(time_str, '%H:%M:%S').time()) + india_offset
            expected_checkout, day_status = determine_checkout_and_status(checkin_dt)
            attendance.append([name, date_str, time_str, '', 'Present', expected_checkout, '', day_status])
            update_attendance_in_db(company_id, attendance)
            return True, expected_checkout, day_status
    else:
        last = today_records[-1]
        # if action == 'checkout' and last[2] and not last[3]:
        #     delta = now - datetime.combine(date.today(), datetime.strptime(last[2], '%H:%M:%S').time())
        #     if delta.total_seconds() < 0:
        #         delta += timedelta(days=1)
        #     if delta >= timedelta(hours=4):
        #         print(f'Time since check-in: {delta}')
        #         last[3] = time_str
        #         last[6] = calculate_hours(last[2], time_str)
        #         update_attendance_in_db(company_id, attendance)
        #         return True, last[6], last[7]
        # elif action == 'checkin' and not last[2]:
        #     last[2] = time_str
        #     checkin_dt = datetime.combine(datetime.today(), datetime.strptime(time_str, '%H:%M:%S').time()) + india_offset
        #     last[5], last[7] = determine_checkout_and_status(checkin_dt)

        #     update_attendance_in_db(company_id, attendance)
        #     return True, last[5], last[7]
        #  last = today_records[-1]
        if action == 'checkout' and last[2] and not last[3]:
            last[3] = time_str
            last[6] = calculate_hours(last[2], time_str)
            update_attendance_in_db(company_id, attendance)
            return True, last[6], last[7]
        elif action == 'checkin' and not last[2]:
            last[2] = time_str
            checkin_dt = datetime.combine(datetime.today(), datetime.strptime(time_str, '%H:%M:%S').time()) + india_offset
            last[5], last[7] = determine_checkout_and_status(checkin_dt)
            update_attendance_in_db(company_id, attendance)
    return False, '', last[7] if today_records else 'Full Day'


@lru_cache(maxsize=128)
def get_checkin_image_base64(company_id, name, date_str):
    path = os.path.join("temp_checkin_images", f"{company_id}_{name}_{date_str.replace('/', '-')}.jpg")
    if os.path.exists(path):
        with open(path, "rb") as f:
            import base64
            return f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"
    return None


def get_company_times_from_db(company_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT check_in, check_out, required_hours FROM Companies WHERE company_id = ?", (company_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            ci, co, rh = row['check_in'], row['check_out'], row['required_hours']
            return ci, co, float(rh) if rh else None
    except Exception as e:
        logger.error(f"Error in get_company_times_from_db_from_db: {e}")
    return None, None, None



def calculate_working_days(year, month):
    """
    Calculates working days excluding Sundays and second/fourth Saturdays.
    """
    working_days = []
    saturday_count = 0

    for day in range(1, monthrange(year, month)[1] + 1):
        current_date = datetime(year, month, day)
        weekday = current_date.weekday()

        # Weekday: Monday=0, Sunday=6
        if weekday < 5:  # Monday to Friday
            working_days.append(current_date.strftime('%d/%m/%Y'))
        elif weekday == 5:  # Saturday
            saturday_count += 1
            if saturday_count not in [2, 4]:  # Exclude 2nd and 4th Saturday
                working_days.append(current_date.strftime('%d/%m/%Y'))
        # Skip Sundays (weekday == 6)

    return working_days

def calculate_weekly_working_days(start_date):
    d = datetime.strptime(start_date, '%Y-%m-%d')
    monday = d - timedelta(days=d.weekday())
    return [(monday + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(5)]


def get_leave_balance_from_db(company_id, name, ym):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT total_leaves, used_leaves FROM Leaves 
            WHERE company_id = ? AND employee_name = ? AND year_month = ?
        """, (company_id, name, ym))
        row = cursor.fetchone()
        conn.close()
        if row:
            return int(row['total_leaves']), int(row['used_leaves'])
        return 2, 0  # default leaves if no record
    except Exception as e:
        logger.error(f"Error in get_leave_balance_from_db_from_db: {e}")
        return 2, 0


def generate_company_id(company_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT company_id FROM Companies WHERE company_id LIKE ?", (f"{company_name}_%",))
        existing_ids = cursor.fetchall()
        conn.close()

        filtered = [cid['company_id'] for cid in existing_ids if cid['company_id'].startswith(company_name + "_")]
        if not filtered:
            return f"{company_name}_01"
        suffixes = [int(cid.split("_")[1]) for cid in filtered if len(cid.split("_")) == 2 and cid.split("_")[1].isdigit()]
        max_suffix = max(suffixes) if suffixes else 0
        return f"{company_name}_{str(max_suffix + 1).zfill(2)}"
    except Exception as e:
        logger.error(f"Error in generate_company_id: {e}")
        return f"{company_name}_01"

def get_table_name_if_exists(table_name):
    """
    Check if a table with name `table_name` exists in the SQLite database.
    Return table name if exists, else None.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,)
        )
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None
    except Exception as e:
        logger.error(f"Error in get_table_name_if_exists: {e}")
        return None

def get_sheet_id(sheet_title):
    """
    In SQLite context, this checks if a table with name sheet_title exists.
    Returns table name if exists, else None.
    """
    return get_table_name_if_exists(sheet_title)
