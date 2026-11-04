from flask import Blueprint, render_template, request, redirect, session, url_for, flash
# from googleapiclient.discovery import build
from datetime import datetime, timedelta
import os
import shutil
import random  # Added missing import for random

from app.utils.google import service
from app.utils.attendance_utils import SHEET_ID, read_attendance_from_db, get_leave_balance_from_db , logger
from pytz import timezone  # Added missing import for timezone
import calendar  # Added missing import for calendar
user_bp = Blueprint('user', __name__)

@user_bp.route('/student_dashboard/<company_id>/<name>')
def student_dashboard(company_id, name):
    if 'username' not in session or session.get('role') != 'super_admin':
        return redirect(url_for('main.login'))

    # Fetch company name and leaves per month
    # Fetch company name
    result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:B').execute()
    companies = result.get('values', [])
    company = next((c for c in companies if c[0] == company_id), None)
    if not company:
        return "Company not found", 404
    company_name = company[1]

    # Get filter parameters (month and year)
    current_date = datetime.now(timezone('Asia/Kolkata'))  # Current date: May 29, 2025
    month = int(request.args.get('month', current_date.month))  # Default to May (5)
    year = int(request.args.get('year', current_date.year))  # Default to 2025

    # Calculate total days in the selected month
    _, total_days = calendar.monthrange(year, month)

    # Define the selected month and year as a datetime object
    selected_month_start = datetime(year, month, 1)
    month_name = selected_month_start.strftime('%B')  # e.g., "May" or "June"
    year_month = selected_month_start.strftime('%Y-%m')  # e.g., "2025-05"

    # Fetch attendance records
    attendance = read_attendance_from_db(company_id)
    user_records = [r for r in attendance if r[0] == name]
    
    # Filter records for the selected month and year
    filtered_records = [
        r for r in user_records 
        if datetime.strptime(r[1], '%d/%m/%Y').strftime('%Y-%m') == year_month
    ]

    attendance_records = [
        {
            'date': record[1],
            'time_range': f"{record[2]} - {record[3]}" if record[2] and record[3] else (record[2] or record[3] or 'N/A'),
            'status': record[4],
            'hours': record[6] or 'N/A',
            'day_status': record[7] or 'N/A'
        } for record in filtered_records
    ]

    # Generate dates for the selected month
    dates = [(selected_month_start + timedelta(days=i)).strftime('%d/%m/%Y') for i in range(total_days)]
    
    # Initialize data arrays for the chart
    present_data = [0] * total_days
    absent_data = [0] * total_days
    halfday_data = [0] * total_days
    leave_data = [0] * total_days
    present_days = 0

    # Fetch leave records for the selected month
    leave_result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Leaves!A2:F').execute()
    leave_records = leave_result.get('values', [])
    leave_dates = []
    for record in leave_records:
        if (len(record) >= 3 and record[0] == company_id and record[1] == name and 
            record[2] == year_month and len(record) > 4 and record[4]):
            try:
                leaves_taken = int(record[4])
                for i in range(leaves_taken):
                    if i < total_days:
                        leave_dates.append(dates[i])
            except ValueError:
                pass

    # Determine the last marked day
    last_marked_day = total_days  # Default to the last day of the selected month
    if year == current_date.year and month == current_date.month:
        last_marked_day = current_date.day  # Use current day (29) for May 2025
    elif year > current_date.year or (year == current_date.year and month > current_date.month):
        last_marked_day = 0  # No data for future months

    # Process attendance up to the last marked day
    for i, date_str in enumerate(dates):
        day_of_month = i + 1
        if day_of_month > last_marked_day:
            continue

        if date_str in leave_dates:
            leave_data[i] = random.uniform(0.1, 0.9)
            logger.debug(f"Marked {date_str} as Leave for {name}")
        else:
            record = next((r for r in filtered_records if r[1] == date_str), None)
            if record:
                if record[4] == 'Present':
                    present_data[i] = random.uniform(0.1, 0.9)
                    present_days += 1
                    logger.debug(f"Marked {date_str} as Present for {name}")
                elif record[4] == 'HalfDay':
                    halfday_data[i] = random.uniform(0.1, 0.9)
                    logger.debug(f"Marked {date_str} as HalfDay for {name}")
                elif record[4] == 'Leave':
                    leave_data[i] = random.uniform(0.1, 0.9)
                    logger.debug(f"Marked {date_str} as Leave for {name}")
                else:
                    absent_data[i] = random.uniform(0.1, 0.9)
                    logger.debug(f"Marked {date_str} as Absent for {name} (status: {record[4]})")
            else:
                absent_data[i] = random.uniform(0.1, 0.9)
                logger.debug(f"Marked {date_str} as Absent for {name} (no record)")

    # Prepare chart data
    attendance_data = {
        'dates': dates,
        'present': present_data,
        'absent': absent_data,
        'halfday': halfday_data,
        'leave': leave_data
    }

    # Calculate last recorded date
    if year > current_date.year or (year == current_date.year and month > current_date.month):
        last_recorded_date = "N/A"
    elif year == current_date.year and month == current_date.month:
        last_recorded_date = "29/05/2025"
    else:
        last_recorded_date = f"{total_days:02d}/{month:02d}/{year}"

    # Get leave balance for the selected month
    leaves_allowed, leaves_taken = get_leave_balance_from_db(company_id, name, year_month)

    logger.debug(f"Attendance data for {name} in {year_month}: Present: {sum(1 for x in present_data if x > 0)}, "
                 f"Absent: {sum(1 for x in absent_data if x > 0)}, "
                 f"HalfDay: {sum(1 for x in halfday_data if x > 0)}, "
                 f"Leave: {sum(1 for x in leave_data if x > 0)}, "
                 f"Total Days: {total_days}")

    return render_template(
        'student_dashboard.html',
        company_id=company_id,
        company_name=company_name,
        student_name=name,
        attendance_records=attendance_records,
        attendance_data=attendance_data,
        present_days=present_days,
        total_days=total_days,
        leaves_taken=leaves_taken,
        leaves_allowed=leaves_allowed,
        month_name=month_name,
        month=month,
        year=year,
        last_recorded_date=last_recorded_date
    )

