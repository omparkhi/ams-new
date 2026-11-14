import logging
from datetime import datetime
from flask import request, jsonify
from app.utils.db_utils import get_db_connection
from .auth import token_required
from . import api_bp

logger = logging.getLogger(__name__)


@api_bp.route('/payroll/members', methods=['GET'])
@token_required
def get_payroll_members(current_user):
    """
    Returns all enrolled members for the tenant company along with their base salary.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u."User Name" as name, COALESCE(s.base_salary, 25000.0) as base_salary,
                   COALESCE(s.hra, 0.0) as hra, COALESCE(s.allowances, 0.0) as allowances
            FROM Users u
            LEFT JOIN SalaryStructures s ON s.company_id = u."Company ID" AND s.user_name = u."User Name"
            WHERE u."Company ID" = ?
            ORDER BY u."User Name" ASC
        """, (company_id,))

        members = []
        for row in cursor.fetchall():
            members.append({
                'name': row['name'],
                'base_salary': float(row['base_salary']),
                'hra': float(row['hra']),
                'allowances': float(row['allowances'])
            })

        return jsonify({'members': members, 'total': len(members)}), 200
    except Exception as e:
        logger.error(f"Error fetching payroll members for {company_id}: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/salary', methods=['POST'])
@token_required
def update_member_salary(current_user):
    """
    Sets or updates the base monthly salary/stipend for a member.
    """
    company_id = current_user.get('company_id')
    data = request.get_json(silent=True) or {}
    user_name = data.get('user_name', '').strip()
    base_salary = data.get('base_salary')

    if not user_name:
        return jsonify({'error': 'User name is required.'}), 400

    try:
        base_salary = float(base_salary)
        if base_salary < 0:
            return jsonify({'error': 'Base salary cannot be negative.'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid base salary amount.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO SalaryStructures (company_id, user_name, base_salary)
            VALUES (?, ?, ?)
            ON CONFLICT(company_id, user_name) DO UPDATE SET base_salary = excluded.base_salary
        """, (company_id, user_name, base_salary))
        conn.commit()

        return jsonify({
            'success': True,
            'message': f'Salary for {user_name} updated to {base_salary:.2f}',
            'user_name': user_name,
            'base_salary': base_salary
        }), 200
    except Exception as e:
        logger.error(f"Error updating salary for {user_name} ({company_id}): {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/calculate', methods=['GET'])
@token_required
def calculate_monthly_payroll(current_user):
    """
    Auto-calculates monthly payroll from biometric AttendanceRecords.
    Query parameters:
    - month (1-12, default current month)
    - year (YYYY, default current year)
    - working_days (default 26)
    """
    company_id = current_user.get('company_id')
    now = datetime.now()

    try:
        month = int(request.args.get('month', now.month))
        year = int(request.args.get('year', now.year))
        working_days = float(request.args.get('working_days', 26))
        if working_days <= 0:
            working_days = 26.0
    except ValueError:
        return jsonify({'error': 'Invalid month, year, or working_days parameter.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()

        # 1. Fetch all members with their base salary
        cursor.execute("""
            SELECT u."User Name" as name, COALESCE(s.base_salary, 25000.0) as base_salary
            FROM Users u
            LEFT JOIN SalaryStructures s ON s.company_id = u."Company ID" AND s.user_name = u."User Name"
            WHERE u."Company ID" = ?
            ORDER BY u."User Name" ASC
        """, (company_id,))
        users = cursor.fetchall()

        # 2. Check if this month is already approved/locked
        cursor.execute("""
            SELECT id, status, total_net, total_employees, processed_at
            FROM PayrollRuns
            WHERE company_id = ? AND month = ? AND year = ?
        """, (company_id, month, year))
        saved_run = cursor.fetchone()
        is_locked = bool(saved_run and saved_run['status'] in ('Approved', 'Processed', 'Paid'))

        # 3. Pull attendance records for this month
        # Support both DD/MM/YYYY and YYYY-MM-DD formats
        slash_pattern = f"%/{month:02d}/{year}"
        dash_pattern = f"{year}-{month:02d}-%"
        cursor.execute("""
            SELECT user_name, date, status, day_status, hours
            FROM AttendanceRecords
            WHERE company_id = ? AND (date LIKE ? OR date LIKE ?)
        """, (company_id, slash_pattern, dash_pattern))
        records = cursor.fetchall()

        # Group attendance by user_name
        att_by_user = {}
        for r in records:
            u_name = r['user_name']
            if u_name not in att_by_user:
                att_by_user[u_name] = []
            att_by_user[u_name].append(r)

        items = []
        total_payout = 0.0
        total_present_days = 0.0

        for u in users:
            name = u['name']
            base_salary = float(u['base_salary'])
            user_records = att_by_user.get(name, [])

            present_count = 0.0
            half_day_count = 0

            for rec in user_records:
                d_status = (rec['day_status'] or '').strip().lower()
                s_status = (rec['status'] or '').strip().lower()

                if d_status in ('full day', 'present') or s_status == 'present':
                    present_count += 1.0
                elif d_status == 'half day':
                    half_day_count += 1

            payable_days = present_count + (half_day_count * 0.5)
            # Cap payable days to working_days for standard payroll calculations
            effective_payable = min(working_days, payable_days)
            absent_days = max(0.0, working_days - payable_days)

            # Calculation: (Payable Days / Working Days) * Base Salary
            per_day_rate = base_salary / working_days if working_days > 0 else 0.0
            lop_deduction = round(absent_days * per_day_rate, 2)
            net_pay = round(effective_payable * per_day_rate, 2)

            total_payout += net_pay
            total_present_days += payable_days

            items.append({
                'user_name': name,
                'base_salary': base_salary,
                'working_days': working_days,
                'present_days': present_count,
                'half_days': half_day_count,
                'absent_days': absent_days,
                'payable_days': payable_days,
                'lop_deduction': lop_deduction,
                'bonus': 0.0,
                'net_pay': net_pay,
                'status': 'Approved' if is_locked else 'Calculated'
            })

        avg_attendance = round((total_present_days / (len(users) * working_days) * 100), 1) if (users and working_days > 0) else 0.0

        summary = {
            'total_employees': len(users),
            'total_payout': round(total_payout, 2),
            'avg_attendance_rate': avg_attendance,
            'is_locked': is_locked,
            'status': saved_run['status'] if saved_run else 'Draft'
        }

        return jsonify({
            'month': month,
            'year': year,
            'working_days': working_days,
            'items': items,
            'summary': summary
        }), 200
    except Exception as e:
        logger.error(f"Error calculating payroll for {company_id} ({month}/{year}): {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/finalize', methods=['POST'])
@token_required
def finalize_payroll(current_user):
    """
    Approves, saves, and locks a monthly payroll run along with individual itemized payslips.
    """
    company_id = current_user.get('company_id')
    data = request.get_json(silent=True) or {}

    month = data.get('month')
    year = data.get('year')
    working_days = float(data.get('working_days', 26))
    items = data.get('items', [])

    if not month or not year or not items:
        return jsonify({'error': 'Month, year, and employee payroll items are required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()
        total_gross = sum(float(it.get('base_salary', 0.0)) for it in items)
        total_net = sum(float(it.get('net_pay', 0.0)) for it in items)
        total_deductions = sum(float(it.get('lop_deduction', 0.0)) for it in items)
        total_employees = len(items)

        # 1. Upsert into PayrollRuns
        cursor.execute("""
            INSERT INTO PayrollRuns (company_id, month, year, total_employees, total_gross, total_deductions, total_net, status, working_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
            ON CONFLICT(company_id, month, year) DO UPDATE SET
                total_employees = excluded.total_employees,
                total_gross = excluded.total_gross,
                total_deductions = excluded.total_deductions,
                total_net = excluded.total_net,
                status = 'Approved',
                working_days = excluded.working_days,
                processed_at = CURRENT_TIMESTAMP
        """, (company_id, month, year, total_employees, total_gross, total_deductions, total_net, working_days))

        cursor.execute("SELECT id FROM PayrollRuns WHERE company_id = ? AND month = ? AND year = ?", (company_id, month, year))
        run_row = cursor.fetchone()
        run_id = run_row['id'] if run_row else None

        # 2. Upsert into Payslips
        for it in items:
            u_name = it.get('user_name')
            base_sal = float(it.get('base_salary', 0.0))
            pres_days = float(it.get('present_days', 0.0))
            half_days = int(it.get('half_days', 0))
            abs_days = float(it.get('absent_days', 0.0))
            lop_ded = float(it.get('lop_deduction', 0.0))
            net = float(it.get('net_pay', 0.0))

            # Delete any existing payslip for this run and user
            cursor.execute("DELETE FROM Payslips WHERE payroll_run_id = ? AND user_name = ?", (run_id, u_name))

            cursor.execute("""
                INSERT INTO Payslips (
                    payroll_run_id, company_id, user_name, month, year, working_days,
                    present_days, half_days, absent_days, base_salary, gross_pay,
                    lop_deduction, net_pay, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved')
            """, (run_id, company_id, u_name, month, year, working_days, pres_days, half_days, abs_days, base_sal, base_sal, lop_ded, net))

        conn.commit()

        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Payroll for {month:02d}/{year} finalized and locked successfully.'
        }), 200
    except Exception as e:
        logger.error(f"Error finalizing payroll for {company_id} ({month}/{year}): {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/history', methods=['GET'])
@token_required
def get_payroll_history(current_user):
    """
    Returns previous approved payroll runs for the company tenant.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, month, year, total_employees, total_gross, total_deductions, total_net, status, processed_at
            FROM PayrollRuns
            WHERE company_id = ?
            ORDER BY year DESC, month DESC
        """, (company_id,))

        history = []
        for r in cursor.fetchall():
            history.append({
                'id': r['id'],
                'month': r['month'],
                'year': r['year'],
                'total_employees': r['total_employees'],
                'total_gross': float(r['total_gross']),
                'total_deductions': float(r['total_deductions']),
                'total_net': float(r['total_net']),
                'status': r['status'],
                'processed_at': r['processed_at']
            })

        return jsonify({'history': history, 'total': len(history)}), 200
    except Exception as e:
        logger.error(f"Error fetching payroll history for {company_id}: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/payslip', methods=['GET'])
@token_required
def get_payslip(current_user):
    """
    Returns an individual payslip record for a specific employee and pay period.
    """
    company_id = current_user.get('company_id')
    user_name = request.args.get('user_name', '').strip()
    month = request.args.get('month')
    year = request.args.get('year')

    if not user_name or not month or not year:
        return jsonify({'error': 'user_name, month, and year are required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_name, month, year, working_days, present_days, half_days,
                   absent_days, base_salary, gross_pay, lop_deduction, net_pay, status, created_at
            FROM Payslips
            WHERE company_id = ? AND user_name = ? AND month = ? AND year = ?
            ORDER BY id DESC LIMIT 1
        """, (company_id, user_name, int(month), int(year)))

        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Payslip not found for this period.'}), 404

        payslip = {
            'id': row['id'],
            'user_name': row['user_name'],
            'month': row['month'],
            'year': row['year'],
            'working_days': float(row['working_days']),
            'present_days': float(row['present_days']),
            'half_days': int(row['half_days']),
            'absent_days': float(row['absent_days']),
            'base_salary': float(row['base_salary']),
            'gross_pay': float(row['gross_pay']),
            'lop_deduction': float(row['lop_deduction']),
            'net_pay': float(row['net_pay']),
            'status': row['status'],
            'created_at': row['created_at']
        }

        return jsonify({'payslip': payslip}), 200
    except Exception as e:
        logger.error(f"Error fetching payslip for {user_name} ({company_id}): {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
