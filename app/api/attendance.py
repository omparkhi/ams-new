import os
import io
from datetime import datetime, timedelta
from flask import request, jsonify, send_file
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.utils import get_column_letter

from app.utils.db_utils import get_db_connection
from app.utils.attendance_utils import (
    read_attendance_from_db,
    update_attendance_in_db,
    calculate_hours,
    calculate_working_days,
    get_ist_now,
    log_attendance,
    TEMP_CHECKIN_IMAGES_DIR
)
from .auth import token_required
from . import api_bp


@api_bp.route('/attendance/today', methods=['GET'])
@token_required
def get_today_attendance(current_user):
    """
    Returns today's live roster and aggregate stats for the company dashboard.
    """
    company_id = current_user.get('company_id')
    now = get_ist_now()
    today = now.strftime('%d/%m/%Y')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ? ORDER BY "User Name" ASC', (company_id,))
        names = [row['User Name'] for row in cursor.fetchall()]
    finally:
        conn.close()

    attendance = read_attendance_from_db(company_id)
    roster = []
    present_count = 0
    absent_count = 0
    completed_count = 0

    for name in names:
        today_records = [r for r in attendance if r[0] == name and r[1] == today]
        checkin, checkout, status, hours, day_status = '', '', 'Absent', '0', 'Absent'
        allow_checkout = False

        if today_records:
            rec = today_records[-1]
            checkin = rec[2] or ''
            checkout = rec[3] or ''
            status = rec[4] or 'Absent'
            hours = rec[6] or '0'
            day_status = rec[7] if len(rec) > 7 else ('Present' if checkin else 'Absent')
            allow_checkout = bool(checkin and not checkout)

        if status == 'Present' or checkin:
            present_count += 1
            if checkout:
                completed_count += 1
        else:
            absent_count += 1

        snapshot_name = f"{company_id}_{name}_{today.replace('/', '-')}.jpg"
        has_snapshot = os.path.exists(os.path.join(TEMP_CHECKIN_IMAGES_DIR, snapshot_name))

        roster.append({
            'name': name,
            'checkin': checkin,
            'checkout': checkout,
            'status': status,
            'hours': hours,
            'day_status': day_status,
            'allow_checkout': allow_checkout,
            'has_snapshot': has_snapshot,
            'snapshot_url': f"/api/attendance/snapshot/{snapshot_name}" if has_snapshot else None
        })

    return jsonify({
        'date': today,
        'company_id': company_id,
        'summary': {
            'total_enrolled': len(names),
            'present_today': present_count,
            'absent_today': absent_count,
            'completed_today': completed_count
        },
        'roster': roster
    }), 200


@api_bp.route('/attendance/force-checkout', methods=['POST'])
@token_required
def force_checkout(current_user):
    """
    Administrative force check-out for a student who left without scanning out.
    """
    company_id = current_user.get('company_id')
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'Student name is required.'}), 400

    now = get_ist_now()
    today = now.strftime('%d/%m/%Y')
    time_str = now.strftime('%H:%M:%S')

    attendance = read_attendance_from_db(company_id)
    updated = False
    hours_worked = '0'

    for idx, record in enumerate(attendance):
        if record[0] == name and record[1] == today and record[2] and not record[3]:
            updated_record = list(record)
            updated_record[3] = time_str
            updated_record[4] = 'Present'
            hours_worked = calculate_hours(updated_record[2], time_str)
            updated_record[6] = hours_worked
            updated_record[7] = 'Present'
            attendance[idx] = updated_record
            updated = True
            break

    if updated:
        update_attendance_in_db(company_id, attendance)
        snapshot_name = f"{company_id}_{name}_{today.replace('/', '-')}.jpg"
        snapshot_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, snapshot_name)
        if os.path.exists(snapshot_path):
            try:
                os.remove(snapshot_path)
            except Exception:
                pass

        return jsonify({
            'success': True,
            'message': f'Checkout forced for {name} at {time_str}. Hours logged: {hours_worked}.',
            'checkout_time': time_str,
            'hours': hours_worked
        }), 200

    return jsonify({'error': f'No active open check-in found for {name} today.'}), 404


@api_bp.route('/attendance/force-checkin', methods=['POST'])
@token_required
def force_checkin(current_user):
    """
    Administrative check-in for a student directly from the dashboard.
    """
    company_id = current_user.get('company_id')
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'Student name is required.'}), 400

    now = get_ist_now()
    today = now.strftime('%d/%m/%Y')
    attendance = read_attendance_from_db(company_id)
    today_records = [r for r in attendance if r[0] == name and r[1] == today]

    if today_records and today_records[-1][2]:
        return jsonify({'error': f'{name} is already checked in today.'}), 400

    success, expected_checkout, day_status = log_attendance(company_id, name, 'checkin')
    if success:
        return jsonify({
            'success': True,
            'message': f'Checked in {name} successfully! Expected out: {expected_checkout} ({day_status}).'
        }), 200
    else:
        return jsonify({'error': 'Failed to record check-in.'}), 500


@api_bp.route('/attendance/history', methods=['GET'])
@token_required
def get_attendance_history(current_user):
    """
    Returns historical attendance records with optional filtering by student name or date.
    """
    company_id = current_user.get('company_id')
    filter_name = request.args.get('name', '').strip()
    filter_date = request.args.get('date', '').strip()

    attendance = read_attendance_from_db(company_id)
    results = []

    for r in attendance:
        name = r[0]
        date_str = r[1]
        if filter_name and filter_name.lower() not in name.lower():
            continue
        if filter_date and date_str != filter_date:
            continue

        results.append({
            'name': name,
            'date': date_str,
            'checkin': r[2] if len(r) > 2 else '',
            'checkout': r[3] if len(r) > 3 else '',
            'status': r[4] if len(r) > 4 else 'Absent',
            'expected_checkout': r[5] if len(r) > 5 else '',
            'hours': r[6] if len(r) > 6 else '',
            'day_status': r[7] if len(r) > 7 else ''
        })

    return jsonify({'total': len(results), 'records': results}), 200


@api_bp.route('/attendance/snapshot/<path:filename>', methods=['GET'])
def get_snapshot(filename):
    """
    Serves a temporary check-in image for supervisor review.
    """
    file_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, filename)
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='image/jpeg')
    return jsonify({'error': 'Image snapshot not found.'}), 404


@api_bp.route('/attendance/export-excel', methods=['GET'])
@token_required
def export_attendance_excel(current_user):
    """
    Streams a fully formatted, color-coded OpenPyXL workbook:
    - Green for Present
    - Red for Half Day
    - Yellow for Absent
    """
    company_id = current_user.get('company_id')
    company_name = current_user.get('company_name', company_id)

    now = get_ist_now()
    year = int(request.args.get('year', now.year))
    month = int(request.args.get('month', now.month))

    working_days = calculate_working_days(year, month)
    attendance = read_attendance_from_db(company_id)

    # Fetch users for company
    conn = get_db_connection()
    names = []
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ? ORDER BY "User Name" ASC', (company_id,))
            names = [row['User Name'] for row in cursor.fetchall()]
        finally:
            conn.close()

    # Create Excel Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Attendance {month:02d}-{year}"

    # Fills & Fonts
    green_fill = PatternFill(start_color="90EE90", end_color="90EE90", fill_type="solid")
    red_fill = PatternFill(start_color="FFB6C1", end_color="FFB6C1", fill_type="solid")
    yellow_fill = PatternFill(start_color="FFFFE0", end_color="FFFFE0", fill_type="solid")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Arial", size=10, bold=True)

    # Header Row
    headers = ["Student Name"] + [d.split('/')[0] for d in working_days] + ["Total Present", "Total Half-Day", "Total Absent", "Effective Days"]
    ws.append(headers)

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Data Rows
    for name in names:
        p_count = 0
        h_count = 0
        a_count = 0
        row_cells = [name]

        for day in working_days:
            match = next((r for r in attendance if r[0] == name and r[1] == day), None)
            if match and match[2]:
                status = match[7] if len(match) > 7 and match[7] else ('Half Day' if match[4] == 'Half Day' else 'Present')
                if status == 'Half Day':
                    row_cells.append('H')
                    h_count += 1
                else:
                    row_cells.append('P')
                    p_count += 1
            else:
                row_cells.append('A')
                a_count += 1

        effective_days = p_count + (0.5 * h_count)
        row_cells.extend([p_count, h_count, a_count, effective_days])
        ws.append(row_cells)

        current_row = ws.max_row
        for col_idx in range(2, len(working_days) + 2):
            c = ws.cell(row=current_row, column=col_idx)
            val = c.value
            if val == 'P':
                c.fill = green_fill
            elif val == 'H':
                c.fill = red_fill
            elif val == 'A':
                c.fill = yellow_fill
            c.alignment = Alignment(horizontal="center", vertical="center")

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 5)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"AMS_Attendance_{company_id}_{month:02d}_{year}.xlsx"
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )

