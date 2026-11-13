import re
from flask import request, jsonify
from app.utils.db_utils import get_db_connection
from .auth import token_required
from . import api_bp


@api_bp.route('/company/settings', methods=['GET'])
@token_required
def get_company_settings(current_user):
    """
    Returns shift policy and company configuration.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM Companies WHERE "Company ID" = ?', (company_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Company not found.'}), 404

        data = dict(row)
        if 'Password' in data:
            del data['Password']

        return jsonify({'settings': data}), 200
    finally:
        conn.close()


@api_bp.route('/company/settings', methods=['PUT'])
@token_required
def update_company_settings(current_user):
    """
    Updates shift timings, mandatory hours, leave policies, and company metadata.
    """
    company_id = current_user.get('company_id')
    data = request.get_json(silent=True) or {}

    check_in_time = data.get('check_in_time', '').strip()
    check_out_time = data.get('check_out_time', '').strip()
    required_hours = str(data.get('required_hours', '')).strip()
    leaves_per_month = str(data.get('leaves_per_month', '')).strip()
    address = data.get('address', '').strip()
    contact = data.get('contact', '').strip()
    email = data.get('email', '').strip()

    updates = []
    params = []

    if check_in_time:
        if not re.match(r'^\d{2}:\d{2}(:\d{2})?$', check_in_time):
            return jsonify({'error': 'Invalid check-in time format (HH:MM required)'}), 400
        if len(check_in_time) == 5:
            check_in_time += ':00'
        updates.append('"Check In Time" = ?')
        params.append(check_in_time)

    if check_out_time:
        if not re.match(r'^\d{2}:\d{2}(:\d{2})?$', check_out_time):
            return jsonify({'error': 'Invalid check-out time format (HH:MM required)'}), 400
        if len(check_out_time) == 5:
            check_out_time += ':00'
        updates.append('"Check Out Time" = ?')
        params.append(check_out_time)

    if required_hours:
        try:
            float(required_hours)
            updates.append('"Required Hours" = ?')
            params.append(required_hours)
        except ValueError:
            return jsonify({'error': 'Required hours must be a valid number.'}), 400

    if leaves_per_month:
        updates.append('"Leaves Per Month" = ?')
        params.append(leaves_per_month)

    if address:
        updates.append('"Address" = ?')
        params.append(address)

    if contact:
        updates.append('"Contact" = ?')
        params.append(contact)

    if email:
        updates.append('"Email" = ?')
        params.append(email)

    if not updates:
        return jsonify({'message': 'No changes provided.'}), 200

    params.append(company_id)
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error.'}), 500

    try:
        cursor = conn.cursor()
        query = f'UPDATE Companies SET {", ".join(updates)} WHERE "Company ID" = ?'
        cursor.execute(query, params)
        conn.commit()
        return jsonify({'success': True, 'message': 'Company settings updated successfully.'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Failed to update settings: {str(e)}'}), 500
    finally:
        conn.close()

