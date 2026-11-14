"""
Payroll Engine for Attendify (AMS) Cloud SaaS.
Calculates automated monthly payroll directly from biometric face attendance logs,
leaves, shifts, and salary structures.
"""

import calendar
import logging
from datetime import datetime
from app.utils.db_utils import get_db_connection
from app.utils.attendance_utils import read_attendance_from_db

logger = logging.getLogger(__name__)


def calculate_month_working_days(year, month):
    """
    Calculate the standard number of working days (Monday-Friday) in a given month.
    """
    try:
        year = int(year)
        month = int(month)
        num_days = calendar.monthrange(year, month)[1]
        working_days = 0
        for day in range(1, num_days + 1):
            dt = datetime(year, month, day)
            if dt.weekday() < 5:  # Monday (0) to Friday (4)
                working_days += 1
        return max(1, working_days)
    except Exception as e:
        logger.warning(f"Error calculating working days for {month}/{year}: {e}")
        return 22


def get_company_payroll_settings(company_id):
    """
    Fetch company settings (shift hours, currency, allowed leaves).
    """
    conn = get_db_connection()
    if not conn:
        return {'required_hours': 7.0, 'currency': '₹', 'leaves_per_month': 2}
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "Required Hours", "Currency", "Leaves Per Month" FROM Companies WHERE "Company ID" = ?', (company_id,))
        row = cursor.fetchone()
        if row:
            req_hours = float(row['Required Hours']) if row['Required Hours'] else 7.0
            currency = row['Currency'] if ('Currency' in row.keys() and row['Currency']) else '₹'
            leaves = int(row['Leaves Per Month']) if row['Leaves Per Month'] else 2
            return {
                'required_hours': req_hours,
                'currency': currency,
                'leaves_per_month': leaves
            }
    except Exception as e:
        logger.warning(f"Error fetching company settings for {company_id}: {e}")
    finally:
        conn.close()
    return {'required_hours': 7.0, 'currency': '₹', 'leaves_per_month': 2}


def get_salary_structure(company_id, user_name):
    """
    Fetch salary structure for an employee, or return default package.
    """
    conn = get_db_connection()
    if not conn:
        return _default_salary_structure(company_id, user_name)
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM SalaryStructures WHERE company_id = ? AND user_name = ?', (company_id, user_name))
        row = cursor.fetchone()
        if row:
            d = dict(row)
            d['base_salary'] = float(d.get('base_salary') or 25000.0)
            d['hra'] = float(d.get('hra') or 5000.0)
            d['conveyance_allowance'] = float(d.get('conveyance_allowance') or 2000.0)
            d['special_allowance'] = float(d.get('special_allowance') or 3000.0)
            d['pf_enabled'] = bool(d.get('pf_enabled', 1))
            d['pf_rate'] = float(d.get('pf_rate') or 12.0)
            d['tax_rate'] = float(d.get('tax_rate') or 5.0)
            d['bank_name'] = d.get('bank_name') or 'HDFC Bank'
            d['account_number'] = d.get('account_number') or '•••• •••• 4821'
            d['ifsc_code'] = d.get('ifsc_code') or 'HDFC0001234'
            d['payment_mode'] = d.get('payment_mode') or 'Bank Transfer'
            return d
    except Exception as e:
        logger.warning(f"Error fetching salary structure: {e}")
    finally:
        conn.close()
    return _default_salary_structure(company_id, user_name)


def _default_salary_structure(company_id, user_name):
    return {
        'company_id': company_id,
        'user_name': user_name,
        'base_salary': 25000.0,
        'hra': 5000.0,
        'conveyance_allowance': 2000.0,
        'special_allowance': 3000.0,
        'pf_enabled': True,
        'pf_rate': 12.0,
        'tax_rate': 5.0,
        'bank_name': 'HDFC Bank',
        'account_number': '•••• •••• 4821',
        'ifsc_code': 'HDFC0001234',
        'payment_mode': 'Bank Transfer'
    }


def upsert_salary_structure(company_id, user_name, data):
    """
    Save or update employee salary package.
    """
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO SalaryStructures (
                company_id, user_name, base_salary, hra, conveyance_allowance,
                special_allowance, pf_enabled, pf_rate, tax_rate, bank_name,
                account_number, ifsc_code, payment_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(company_id, user_name) DO UPDATE SET
                base_salary = excluded.base_salary,
                hra = excluded.hra,
                conveyance_allowance = excluded.conveyance_allowance,
                special_allowance = excluded.special_allowance,
                pf_enabled = excluded.pf_enabled,
                pf_rate = excluded.pf_rate,
                tax_rate = excluded.tax_rate,
                bank_name = excluded.bank_name,
                account_number = excluded.account_number,
                ifsc_code = excluded.ifsc_code,
                payment_mode = excluded.payment_mode
        """, (
            company_id,
            user_name,
            float(data.get('base_salary', 25000.0)),
            float(data.get('hra', 5000.0)),
            float(data.get('conveyance_allowance', 2000.0)),
            float(data.get('special_allowance', 3000.0)),
            1 if data.get('pf_enabled', True) else 0,
            float(data.get('pf_rate', 12.0)),
            float(data.get('tax_rate', 5.0)),
            str(data.get('bank_name', '')),
            str(data.get('account_number', '')),
            str(data.get('ifsc_code', '')),
            str(data.get('payment_mode', 'Bank Transfer'))
        ))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error upserting salary structure: {e}")
        return False
    finally:
        conn.close()


def calculate_employee_payroll(company_id, user_name, month, year, working_days, attendance_records, salary_struct=None, company_settings=None):
    """
    Calculate accurate monthly payroll itemization for a single employee based on face attendance records.
    """
    if salary_struct is None:
        salary_struct = get_salary_structure(company_id, user_name)
    if company_settings is None:
        company_settings = get_company_payroll_settings(company_id)

    month_int = int(month)
    year_int = int(year)
    req_hours = float(company_settings.get('required_hours') or 7.0)

    # Filter attendance records for this user in the specified month & year
    # Supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    user_records = []
    for r in attendance_records:
        if r[0] == user_name:
            date_str = str(r[1])
            is_match = False
            try:
                if '/' in date_str:
                    parts = date_str.split('/')
                    if len(parts) == 3 and int(parts[1]) == month_int and int(parts[2]) == year_int:
                        is_match = True
                elif '-' in date_str:
                    parts = date_str.split('-')
                    if len(parts) == 3:
                        if len(parts[0]) == 4 and int(parts[1]) == month_int and int(parts[0]) == year_int:
                            is_match = True
                        elif int(parts[1]) == month_int and int(parts[2]) == year_int:
                            is_match = True
            except Exception:
                pass
            if is_match:
                user_records.append(r)

    # Reconcile biometric attendance counts
    present_days = 0.0
    half_days = 0
    total_hours_worked = 0.0
    overtime_hours = 0.0

    for rec in user_records:
        # rec format: [name, date, in_time, out_time, status, expected_checkout, hours, day_status]
        status = rec[4] if len(rec) > 4 else 'Absent'
        hours_str = rec[6] if len(rec) > 6 else '0'
        day_status = rec[7] if len(rec) > 7 else ''

        hours = 0.0
        try:
            hours = float(hours_str) if hours_str else 0.0
        except ValueError:
            hours = 0.0
        total_hours_worked += hours

        if status == 'Present':
            if day_status == 'Half Day' or (hours > 0 and hours < (req_hours * 0.65)):
                half_days += 1
            else:
                present_days += 1.0
                if hours > req_hours:
                    overtime_hours += (hours - req_hours)

    # Leaves reconciliation
    allowed_leaves = float(company_settings.get('leaves_per_month', 2))
    effective_days = present_days + (half_days * 0.5)
    
    # In standard HR logic: unworked days up to allowed_leaves are paid leave days
    unworked_days = max(0.0, float(working_days) - effective_days)
    paid_leave_days = min(allowed_leaves, unworked_days)
    lop_days = max(0.0, unworked_days - paid_leave_days)
    absent_days = unworked_days

    # Salary components
    base_salary = float(salary_struct.get('base_salary', 25000.0))
    hra = float(salary_struct.get('hra', 5000.0))
    conveyance = float(salary_struct.get('conveyance_allowance', 2000.0))
    special = float(salary_struct.get('special_allowance', 3000.0))
    total_allowances = conveyance + special

    gross_salary = base_salary + hra + total_allowances
    daily_pay_rate = (gross_salary / float(working_days)) if working_days > 0 else 0.0
    hourly_rate = (daily_pay_rate / req_hours) if req_hours > 0 else 0.0

    # Overtime calculation (1.5x standard hourly rate)
    overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)
    gross_pay = round(gross_salary + overtime_pay, 2)

    # Loss of Pay Deduction
    lop_deduction = round(lop_days * daily_pay_rate, 2)

    # Statutory Deductions
    pf_enabled = salary_struct.get('pf_enabled', True)
    pf_rate = float(salary_struct.get('pf_rate', 12.0))
    pf_deduction = round(base_salary * (pf_rate / 100.0), 2) if pf_enabled else 0.0

    tax_rate = float(salary_struct.get('tax_rate', 5.0))
    taxable_amount = max(0.0, gross_salary - lop_deduction)
    tax_deduction = round(taxable_amount * (tax_rate / 100.0), 2)

    total_deductions = round(lop_deduction + pf_deduction + tax_deduction, 2)
    net_pay = round(max(0.0, gross_pay - total_deductions), 2)

    return {
        'company_id': company_id,
        'user_name': user_name,
        'month': month_int,
        'year': year_int,
        'working_days': int(working_days),
        'present_days': round(present_days, 1),
        'half_days': int(half_days),
        'absent_days': round(absent_days, 1),
        'paid_leave_days': round(paid_leave_days, 1),
        'lop_days': round(lop_days, 1),
        'overtime_hours': round(overtime_hours, 1),
        'total_hours_worked': round(total_hours_worked, 1),
        
        # Financial Breakdown
        'base_salary': base_salary,
        'hra': hra,
        'conveyance_allowance': conveyance,
        'special_allowance': special,
        'allowances': total_allowances,
        'daily_pay_rate': round(daily_pay_rate, 2),
        'overtime_pay': overtime_pay,
        'gross_pay': gross_pay,
        'lop_deduction': lop_deduction,
        'pf_deduction': pf_deduction,
        'tax_deduction': tax_deduction,
        'total_deductions': total_deductions,
        'net_pay': net_pay,
        
        # Bank & Payment Info
        'bank_name': salary_struct.get('bank_name', 'HDFC Bank'),
        'account_number': salary_struct.get('account_number', '•••• •••• 4821'),
        'ifsc_code': salary_struct.get('ifsc_code', 'HDFC0001234'),
        'payment_mode': salary_struct.get('payment_mode', 'Bank Transfer'),
        'currency': company_settings.get('currency', '₹')
    }


def preview_payroll(company_id, month, year, custom_working_days=None):
    """
    Simulates monthly payroll across all enrolled employees without writing to the database.
    """
    month = int(month)
    year = int(year)
    working_days = int(custom_working_days) if custom_working_days else calculate_month_working_days(year, month)
    company_settings = get_company_payroll_settings(company_id)

    # Fetch all employees
    conn = get_db_connection()
    if not conn:
        return {'error': 'Database unavailable'}
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ? ORDER BY "User Name" ASC', (company_id,))
        users = [row['User Name'] for row in cursor.fetchall()]
    finally:
        conn.close()

    attendance_records = read_attendance_from_db(company_id)
    employee_results = []
    total_gross = 0.0
    total_lop = 0.0
    total_statutory = 0.0
    total_net = 0.0
    total_overtime_pay = 0.0

    for user_name in users:
        struct = get_salary_structure(company_id, user_name)
        calc = calculate_employee_payroll(company_id, user_name, month, year, working_days, attendance_records, struct, company_settings)
        employee_results.append(calc)
        total_gross += calc['gross_pay']
        total_lop += calc['lop_deduction']
        total_statutory += (calc['pf_deduction'] + calc['tax_deduction'])
        total_net += calc['net_pay']
        total_overtime_pay += calc['overtime_pay']

    return {
        'company_id': company_id,
        'month': month,
        'year': year,
        'month_name': calendar.month_name[month],
        'working_days': working_days,
        'currency': company_settings.get('currency', '₹'),
        'summary': {
            'total_employees': len(users),
            'total_gross': round(total_gross, 2),
            'total_lop_deductions': round(total_lop, 2),
            'total_statutory_deductions': round(total_statutory, 2),
            'total_overtime_pay': round(total_overtime_pay, 2),
            'total_net_payable': round(total_net, 2),
            'average_net_pay': round(total_net / len(users), 2) if users else 0.0
        },
        'employees': employee_results
    }


def commit_payroll_run(company_id, month, year, custom_working_days=None, processed_by='Admin'):
    """
    Executes and locks a monthly payroll run, generating persistent itemized payslips.
    """
    preview = preview_payroll(company_id, month, year, custom_working_days)
    if 'error' in preview:
        return preview

    summary = preview['summary']
    employees = preview['employees']
    month = preview['month']
    year = preview['year']
    working_days = preview['working_days']

    conn = get_db_connection()
    if not conn:
        return {'error': 'Could not connect to database'}

    try:
        cursor = conn.cursor()
        
        # Check if a payroll run already exists for this period
        cursor.execute('SELECT id FROM PayrollRuns WHERE company_id = ? AND month = ? AND year = ?', (company_id, month, year))
        existing_run = cursor.fetchone()

        if existing_run:
            run_id = existing_run['id']
            cursor.execute("""
                UPDATE PayrollRuns SET
                    working_days = ?,
                    total_employees = ?,
                    total_gross = ?,
                    total_deductions = ?,
                    total_net = ?,
                    status = 'Processed',
                    processed_by = ?,
                    processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                working_days,
                summary['total_employees'],
                summary['total_gross'],
                summary['total_lop_deductions'] + summary['total_statutory_deductions'],
                summary['total_net_payable'],
                processed_by,
                run_id
            ))
            # Delete existing payslips for re-generation
            cursor.execute('DELETE FROM Payslips WHERE payroll_run_id = ?', (run_id,))
        else:
            cursor.execute("""
                INSERT INTO PayrollRuns (
                    company_id, month, year, working_days, total_employees,
                    total_gross, total_deductions, total_net, status, processed_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Processed', ?)
            """, (
                company_id,
                month,
                year,
                working_days,
                summary['total_employees'],
                summary['total_gross'],
                summary['total_lop_deductions'] + summary['total_statutory_deductions'],
                summary['total_net_payable'],
                processed_by
            ))
            run_id = cursor.lastrowid

        # Insert itemized payslips
        for emp in employees:
            cursor.execute("""
                INSERT INTO Payslips (
                    payroll_run_id, company_id, user_name, month, year,
                    working_days, present_days, half_days, absent_days,
                    paid_leave_days, lop_days, base_salary, hra, allowances,
                    gross_pay, lop_deduction, pf_deduction, tax_deduction,
                    net_pay, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Generated')
            """, (
                run_id,
                company_id,
                emp['user_name'],
                month,
                year,
                emp['working_days'],
                emp['present_days'],
                emp['half_days'],
                emp['absent_days'],
                emp['paid_leave_days'],
                emp['lop_days'],
                emp['base_salary'],
                emp['hra'],
                emp['allowances'],
                emp['gross_pay'],
                emp['lop_deduction'],
                emp['pf_deduction'],
                emp['tax_deduction'],
                emp['net_pay']
            ))

        conn.commit()
        return {
            'success': True,
            'payroll_run_id': run_id,
            'month': month,
            'year': year,
            'summary': summary,
            'employee_count': len(employees)
        }
    except Exception as e:
        logger.error(f"Error committing payroll run: {e}")
        return {'error': str(e)}
    finally:
        conn.close()


def get_historical_payroll_runs(company_id):
    """
    Retrieve all historical monthly payroll runs for the company.
    """
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, company_id, month, year, total_employees, total_gross,
                   total_deductions, total_net, status, processed_by, processed_at
            FROM PayrollRuns
            WHERE company_id = ?
            ORDER BY year DESC, month DESC
        """, (company_id,))
        rows = cursor.fetchall()
        runs = []
        for r in rows:
            d = dict(r)
            d['month_name'] = calendar.month_name[d['month']]
            runs.append(d)
        return runs
    except Exception as e:
        logger.error(f"Error fetching historical payroll runs: {e}")
        return []
    finally:
        conn.close()


def get_payslip_detail(company_id, payslip_id):
    """
    Fetch a complete single payslip object for display or PDF print.
    """
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM Payslips WHERE id = ? AND company_id = ?', (payslip_id, company_id))
        row = cursor.fetchone()
        if not row:
            return None
        payslip = dict(row)
        payslip['month_name'] = calendar.month_name[payslip['month']]

        # Attach company info and salary struct for bank details
        cursor.execute('SELECT "Company Name", "Address", "Currency", "Email" FROM Companies WHERE "Company ID" = ?', (company_id,))
        comp = cursor.fetchone()
        if comp:
            payslip['company_name'] = comp['Company Name'] or 'Attendify Organization'
            payslip['company_address'] = comp['Address'] or 'Global Tech Park, Bengaluru, India'
            payslip['currency'] = comp['Currency'] or '₹'
            payslip['company_email'] = comp['Email'] or 'hr@attendify.io'

        struct = get_salary_structure(company_id, payslip['user_name'])
        payslip['bank_name'] = struct.get('bank_name', 'HDFC Bank')
        payslip['account_number'] = struct.get('account_number', '•••• •••• 4821')
        payslip['ifsc_code'] = struct.get('ifsc_code', 'HDFC0001234')
        payslip['payment_mode'] = struct.get('payment_mode', 'Bank Transfer')

        return payslip
    except Exception as e:
        logger.error(f"Error fetching payslip detail: {e}")
        return None
    finally:
        conn.close()
