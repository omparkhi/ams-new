"""
Payroll REST API Endpoints for Attendify (AMS).
Handles salary structures, monthly payroll simulations, run execution,
itemized payslip generation, and bank transfer export.
"""

import io
import csv
from datetime import datetime
from flask import request, jsonify, Response
from app.utils.db_utils import get_db_connection
from app.utils.payroll_engine import (
    calculate_month_working_days,
    get_salary_structure,
    upsert_salary_structure,
    preview_payroll,
    commit_payroll_run,
    get_historical_payroll_runs,
    get_payslip_detail,
    get_company_payroll_settings
)
from .auth import token_required
from . import api_bp


@api_bp.route('/payroll/stats', methods=['GET'])
@token_required
def get_payroll_stats(current_user):
    """
    Returns high-level KPI cards for the Payroll dashboard.
    """
    company_id = current_user.get('company_id')
    now = datetime.now()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))

    preview = preview_payroll(company_id, month, year)
    if 'error' in preview:
        return jsonify({'error': preview['error']}), 500

    runs = get_historical_payroll_runs(company_id)
    latest_run = runs[0] if runs else None

    return jsonify({
        'status': 'success',
        'month': month,
        'year': year,
        'month_name': preview['month_name'],
        'working_days': preview['working_days'],
        'currency': preview['currency'],
        'summary': preview['summary'],
        'latest_run': latest_run
    }), 200


@api_bp.route('/payroll/salary-structures', methods=['GET'])
@token_required
def get_all_salary_structures(current_user):
    """
    Returns all employees in the company with their assigned salary structures.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ? ORDER BY "User Name" ASC', (company_id,))
        users = [row['User Name'] for row in cursor.fetchall()]
    finally:
        conn.close()

    structures = []
    for user_name in users:
        s = get_salary_structure(company_id, user_name)
        gross = s['base_salary'] + s['hra'] + s['conveyance_allowance'] + s['special_allowance']
        s['gross_salary'] = round(gross, 2)
        structures.append(s)

    settings = get_company_payroll_settings(company_id)
    return jsonify({
        'status': 'success',
        'currency': settings.get('currency', '₹'),
        'total_employees': len(structures),
        'salary_structures': structures
    }), 200


@api_bp.route('/payroll/salary-structures', methods=['POST'])
@token_required
def update_salary_structure(current_user):
    """
    Creates or updates the salary structure for a specific employee.
    """
    company_id = current_user.get('company_id')
    data = request.get_json() or {}
    user_name = data.get('user_name')

    if not user_name:
        return jsonify({'error': 'user_name is required'}), 400

    success = upsert_salary_structure(company_id, user_name, data)
    if not success:
        return jsonify({'error': 'Failed to save salary structure'}), 500

    updated = get_salary_structure(company_id, user_name)
    return jsonify({
        'status': 'success',
        'message': f'Salary structure updated for {user_name}',
        'salary_structure': updated
    }), 200


@api_bp.route('/payroll/preview', methods=['POST'])
@token_required
def simulate_payroll_preview(current_user):
    """
    Simulates monthly payroll directly from biometric attendance without writing to DB.
    """
    company_id = current_user.get('company_id')
    data = request.get_json() or {}
    now = datetime.now()

    month = int(data.get('month', now.month))
    year = int(data.get('year', now.year))
    working_days = data.get('working_days')

    result = preview_payroll(company_id, month, year, working_days)
    if 'error' in result:
        return jsonify({'error': result['error']}), 500

    return jsonify({
        'status': 'success',
        'data': result
    }), 200


@api_bp.route('/payroll/run', methods=['POST'])
@token_required
def execute_payroll_run(current_user):
    """
    Executes and locks a monthly payroll run, creating itemized payslips.
    """
    company_id = current_user.get('company_id')
    data = request.get_json() or {}
    now = datetime.now()

    month = int(data.get('month', now.month))
    year = int(data.get('year', now.year))
    working_days = data.get('working_days')
    processed_by = current_user.get('username', 'Admin')

    result = commit_payroll_run(company_id, month, year, working_days, processed_by)
    if 'error' in result:
        return jsonify({'error': result['error']}), 500

    return jsonify({
        'status': 'success',
        'message': f"Monthly payroll run processed for {month}/{year}",
        'data': result
    }), 201


@api_bp.route('/payroll/runs', methods=['GET'])
@token_required
def list_payroll_runs(current_user):
    """
    Lists historical payroll run batches for the company.
    """
    company_id = current_user.get('company_id')
    runs = get_historical_payroll_runs(company_id)
    settings = get_company_payroll_settings(company_id)
    return jsonify({
        'status': 'success',
        'currency': settings.get('currency', '₹'),
        'runs': runs
    }), 200


@api_bp.route('/payroll/runs/<int:run_id>', methods=['GET'])
@token_required
def get_single_payroll_run(current_user, run_id):
    """
    Retrieves full details of a payroll run including all generated payslips.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM PayrollRuns WHERE id = ? AND company_id = ?', (run_id, company_id))
        run = cursor.fetchone()
        if not run:
            return jsonify({'error': 'Payroll run not found'}), 404

        run_dict = dict(run)

        cursor.execute('SELECT * FROM Payslips WHERE payroll_run_id = ? ORDER BY user_name ASC', (run_id,))
        payslips = [dict(r) for r in cursor.fetchall()]
        run_dict['payslips'] = payslips

        settings = get_company_payroll_settings(company_id)
        run_dict['currency'] = settings.get('currency', '₹')

        return jsonify({
            'status': 'success',
            'run': run_dict
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/runs/<int:run_id>/status', methods=['PATCH'])
@token_required
def update_payroll_run_status(current_user, run_id):
    """
    Updates status of a payroll run ('Approved', 'Paid').
    """
    company_id = current_user.get('company_id')
    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ['Draft', 'Approved', 'Paid']:
        return jsonify({'error': 'Invalid status. Must be Draft, Approved, or Paid.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE PayrollRuns
            SET status = ?, paid_at = CASE WHEN ? = 'Paid' THEN CURRENT_TIMESTAMP ELSE paid_at END
            WHERE id = ? AND company_id = ?
        """, (new_status, new_status, run_id, company_id))
        
        cursor.execute("""
            UPDATE Payslips
            SET status = ?
            WHERE payroll_run_id = ? AND company_id = ?
        """, (new_status, run_id, company_id))

        conn.commit()
        return jsonify({
            'status': 'success',
            'message': f'Payroll run #{run_id} marked as {new_status}'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/payroll/payslips/<int:payslip_id>', methods=['GET'])
@token_required
def get_payslip(current_user, payslip_id):
    """
    Returns complete payslip object with branding and company header.
    """
    company_id = current_user.get('company_id')
    payslip = get_payslip_detail(company_id, payslip_id)
    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    return jsonify({
        'status': 'success',
        'payslip': payslip
    }), 200


@api_bp.route('/payroll/export/bank-csv', methods=['GET'])
@token_required
def export_bank_transfer_csv(current_user):
    """
    Generates and downloads a standardized CSV formatted for bulk bank disbursements.
    """
    company_id = current_user.get('company_id')
    now = datetime.now()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))

    preview = preview_payroll(company_id, month, year)
    if 'error' in preview:
        return jsonify({'error': preview['error']}), 500

    employees = preview.get('employees', [])

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Standard Bank Bulk Upload Header
    writer.writerow([
        'Beneficiary Name',
        'Bank Name',
        'Account Number',
        'IFSC / Routing Code',
        'Payment Mode',
        'Net Amount',
        'Currency',
        'Month-Year',
        'Remarks'
    ])

    for emp in employees:
        writer.writerow([
            emp['user_name'],
            emp.get('bank_name', 'HDFC Bank'),
            emp.get('account_number', '•••• •••• 4821'),
            emp.get('ifsc_code', 'HDFC0001234'),
            emp.get('payment_mode', 'Bank Transfer'),
            f"{emp['net_pay']:.2f}",
            emp.get('currency', '₹'),
            f"{preview['month_name']} {year}",
            f"Salary for {preview['month_name']} {year}"
        ])

    csv_data = output.getvalue()
    filename = f"Attendify_Bank_Disbursement_{preview['month_name']}_{year}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
