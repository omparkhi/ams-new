import os
import re
import jwt
import random
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.db_utils import get_db_connection, fetch_user_by_username
from . import api_bp

JWT_SECRET = os.getenv("JWT_SECRET", "ams-jwt-secret-key-2026-production")
SUPER_ADMIN_USERNAME = os.getenv("SUPER_ADMIN_USERNAME", "admin")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "admin123")


def generate_token(payload_data, expires_in_days=7):
    payload = {
        **payload_data,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=expires_in_days),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            token = request.args.get('token')
            
        if not token:
            return jsonify({'error': 'Authentication token is required.'}), 401

        try:
            current_user = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired. Please log in again.'}), 401
        except Exception as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


@api_bp.route('/auth/register', methods=['POST'])
def register_company():
    """
    Automated self-service signup for new clients.
    Creates the company tenant, admin credentials, and default shift times dynamically.
    """
    data = request.get_json(silent=True) or {}

    company_name = data.get('company_name', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    check_in_time = data.get('check_in_time', '10:00').strip()
    check_out_time = data.get('check_out_time', '18:30').strip()
    required_hours = str(data.get('required_hours', '7.0')).strip()
    leaves_per_month = str(data.get('leaves_per_month', '2')).strip()
    address = data.get('address', '').strip()
    contact = data.get('contact', '').strip()

    if not company_name or not username or not password:
        return jsonify({'error': 'Company Name, Username, and Password are required.'}), 400

    if not re.match(r'^\d{2}:\d{2}(:\d{2})?$', check_in_time):
        check_in_time = '10:00:00'
    elif len(check_in_time) == 5:
        check_in_time += ':00'

    if not re.match(r'^\d{2}:\d{2}(:\d{2})?$', check_out_time):
        check_out_time = '18:30:00'
    elif len(check_out_time) == 5:
        check_out_time += ':00'

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error.'}), 500

    try:
        cursor = conn.cursor()

        # Check if username already exists (case-insensitive)
        cursor.execute('SELECT * FROM Companies WHERE LOWER("Username") = LOWER(?)', (username,))
        if cursor.fetchone():
            return jsonify({'error': f'Username "{username}" is already taken. If you already have an account, please sign in instead.'}), 409

        # Generate unique company_id
        base_id = company_name.replace(" ", "_")
        company_id = f"{base_id}_01"
        counter = 1
        while True:
            cursor.execute('SELECT "Company ID" FROM Companies WHERE "Company ID" = ?', (company_id,))
            if not cursor.fetchone():
                break
            counter += 1
            company_id = f"{base_id}_{counter:02d}"

        # Generate unique slug
        base_slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-') or 'org'
        slug = base_slug
        slug_counter = 1
        while True:
            cursor.execute('SELECT 1 FROM Companies WHERE "Slug" = ?', (slug,))
            if not cursor.fetchone():
                break
            slug_counter += 1
            slug = f"{base_slug}-{slug_counter}"

        # Generate randomized 6-digit Kiosk PIN
        kiosk_pin = str(random.randint(100000, 999999))

        # Hash password
        password_hash = generate_password_hash(password)

        # Insert new company record
        cursor.execute("""
            INSERT INTO Companies (
                "Company ID", "Company Name", "Username", "Password",
                "Leaves Per Month", "Address", "Contact", "Email",
                "Check In Time", "Check Out Time", "Required Hours",
                "Slug", "Kiosk PIN"
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id, company_name, username, password_hash,
            leaves_per_month, address, contact, email,
            check_in_time, check_out_time, required_hours,
            slug, kiosk_pin
        ))

        # Dynamically create company attendance table
        table_name = company_id.replace(" ", "_")
        cursor.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" (Name TEXT)')

        conn.commit()

        # Generate JWT Token for immediate access
        token = generate_token({
            'company_id': company_id,
            'company_name': company_name,
            'username': username,
            'role': 'company_admin',
            'slug': slug
        })

        return jsonify({
            'success': True,
            'message': f'Company "{company_name}" onboarded successfully!',
            'token': token,
            'user': {
                'company_id': company_id,
                'company_name': company_name,
                'username': username,
                'role': 'company_admin',
                'email': email,
                'slug': slug,
                'kiosk_pin': kiosk_pin
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Failed to create company: {str(e)}'}), 500
    finally:
        conn.close()


@api_bp.route('/auth/login', methods=['POST'])
def login():
    """
    Unified login endpoint for Company Admins and Super Admin.
    """
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Please provide both username and password.'}), 400

    # 1. Check Super Admin credentials
    if username == SUPER_ADMIN_USERNAME and password == SUPER_ADMIN_PASSWORD:
        token = generate_token({
            'company_id': 'GLOBAL_ADMIN',
            'company_name': 'TARS Master Administration',
            'username': username,
            'role': 'super_admin'
        })
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'username': username,
                'role': 'super_admin',
                'company_name': 'TARS Global Super Admin'
            }
        }), 200

    # 2. Check Company credentials in DB
    user_data = fetch_user_by_username(username)
    if not user_data:
        return jsonify({'error': 'Invalid username or password.'}), 401

    stored_password = user_data['Password']
    company_id = user_data['Company ID']
    company_name = user_data['Company Name']

    # Support both hashed password and legacy plaintext password
    is_valid = False
    if stored_password:
        if stored_password.startswith('scrypt:') or stored_password.startswith('pbkdf2:') or stored_password.startswith('argon2:'):
            is_valid = check_password_hash(stored_password, password)
        else:
            is_valid = (stored_password == password)
            if is_valid:
                # Silently auto-upgrade plaintext password to secure hash
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute('UPDATE Companies SET "Password" = ? WHERE "Company ID" = ?',
                                   (generate_password_hash(password), company_id))
                    conn.commit()
                    conn.close()
                except Exception:
                    pass

    if not is_valid:
        return jsonify({'error': 'Invalid username or password.'}), 401

    slug = user_data.get('Slug') or ''
    kiosk_pin = user_data.get('Kiosk PIN') or ''

    token = generate_token({
        'company_id': company_id,
        'company_name': company_name,
        'username': username,
        'role': 'company_admin',
        'slug': slug
    })

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'company_id': company_id,
            'company_name': company_name,
            'username': username,
            'role': 'company_admin',
            'email': user_data.get('Email', ''),
            'slug': slug,
            'kiosk_pin': kiosk_pin
        }
    }), 200


@api_bp.route('/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """
    Returns profile information for the authenticated user.
    """
    company_id = current_user.get('company_id')
    role = current_user.get('role')

    if role == 'super_admin':
        return jsonify({
            'username': current_user.get('username'),
            'role': 'super_admin',
            'company_name': 'TARS Global Super Admin'
        }), 200

    conn = get_db_connection()
    company_info = {}
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM Companies WHERE "Company ID" = ?', (company_id,))
            row = cursor.fetchone()
            if row:
                company_info = dict(row)
                if 'Password' in company_info:
                    del company_info['Password']
        finally:
            conn.close()

    return jsonify({
        'username': current_user.get('username'),
        'role': role,
        'company_id': company_id,
        'company_name': current_user.get('company_name'),
        'details': company_info
    }), 200

