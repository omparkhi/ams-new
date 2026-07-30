from flask import Blueprint, render_template, request, redirect, session, url_for , flash
from googleapiclient.discovery import build
from app.utils.google import service , safe_api_call

import os
import functools

# Set up logging to a file



# Assuming you have Google Sheets API service set up as 'service'
# Example of how you might configure the Google Sheets API:
# service = build('sheets', 'v4', credentials=credentials)

main_bp = Blueprint('main', __name__)

# Constants for super admin login
SUPER_ADMIN_USERNAME = os.getenv("SUPER_ADMIN_USERNAME")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")



# # @main_bp.route('/', methods=['GET', 'POST'])
# # def login():
# #     if request.method == 'POST':
# #         # Get form data and strip any leading/trailing spaces
# #         username = request.form['username'].strip()
# #         password = request.form['password'].strip()

# #         # Check if both username and password are filled
# #         if not username or not password:
# #             return render_template('login.html', error='Please fill in both fields')

# #         # Super admin login check
# #         if username == SUPER_ADMIN_USERNAME and password == SUPER_ADMIN_PASSWORD:
# #             session['username'] = username
# #             session['role'] = 'super_admin'
# #             return redirect(url_for('super_admin.super_admin'))  # Assuming you have this route defined

# #         # Fetch user data from the Google Sheets API
# #         result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:G').execute()
# #         users = result.get('values', [])

# #         # Loop through users and check if username and password match
# #         for user in users:
# #             if len(user) >= 4 and user[2].strip() == username and user[3].strip() == password:
# #                 # User is authenticated, set session variables
# #                 session['username'] = username
# #                 session['role'] = 'company_admin'
# #                 session['company_id'] = user[0]
# #                 session['company_name'] = user[1]

# #                 # Check if company times are set
# #                 if len(user) < 7 or not (user[4] and user[5] and user[6]):
# #                     return redirect(url_for('admin.setup_company_times'))  # Assuming you have this route

# #                 # Fetch company users to check if any users are linked to the company
# #                 user_result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Users!A2:B').execute()
# #                 company_users = [row[1] for row in user_result.get('values', []) if row and row[0] == user[0]]
# #                 if not company_users:
# #                     return redirect(url_for('company.add_user'))  # Assuming you have this route

# #                 # If everything is okay, redirect to the admin panel
# #                 return redirect(url_for('admin.dashboard'))  # Assuming you have this route

# #         # If no user found with matching credentials
# #         return render_template('login.html', error='Invalid credentials')

# #     return render_template('login.html')

# @main_bp.route('/', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         username = request.form['username'].strip()
#         password = request.form['password'].strip()
#         if username == SUPER_ADMIN_USERNAME and password == SUPER_ADMIN_PASSWORD:
#             session['username'] = username
#             session['role'] = 'super_admin'
#             return redirect(url_for('super_admin.super_admin'))
#         result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Companies!A2:D'))
#         users = result.get('values', [])
#         for user in users:
#             if len(user) >= 4 and user[2].strip() == username and user[3].strip() == password:
#                 session['username'] = username
#                 session['role'] = 'company_admin'
#                 session['company_id'] = user[0]
#                 session['company_name'] = user[1]
#                 user_result = safe_api_call(service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range='Users!A2:B'))
#                 company_users = [row[1] for row in user_result.get('values', []) if row and row[0] == user[0]]
#                 if not company_users:
#                     return redirect(url_for('admin.dashboard'))
#                 return redirect(url_for('admin.dashboard'))
#         return render_template('login.html', error='Invalid credentials')
#     return render_template('login.html')


# @main_bp.route('/logout')
# def logout():
#     # Clear the session and log the user out
#     session.clear()
#     return redirect(url_for('main.login'))


# # @main_bp.route('/home')
# # def home():
# #     return render_template('home.html')



import threading
# from flask import Blueprint, render_template, request, redirect, session, url_for
# from app.utils.google import service, safe_api_call

# main_bp = Blueprint('main', __name__)

# SUPER_ADMIN_USERNAME = ...
# SUPER_ADMIN_PASSWORD = ...
# SHEET_ID = ...

# # Global caches and locks
# user_cache = {}
# user_cache_lock = threading.Lock()

# def load_user_cache():
#     global user_cache
#     try:
#         print("[INFO] Loading user cache...")

#         # Step 1: Load Companies
#         companies_result = safe_api_call(
#             service.spreadsheets().values().get(
#                 spreadsheetId=SHEET_ID, range='Companies!A2:D'
#             )
#         )
#         companies = companies_result.get('values', []) or []

#         # Step 2: Load Users
#         users_result = safe_api_call(
#             service.spreadsheets().values().get(
#                 spreadsheetId=SHEET_ID, range='Users!A2:B'
#             )
#         )
#         users = users_result.get('values', []) or []

#         # Step 3: Build a temp cache safely
#         temp_cache = {}

#         for comp in companies:
#             if len(comp) < 4:
#                 continue  # Skip incomplete rows

#             company_id = comp[0].strip()
#             company_name = comp[1].strip()
#             username = comp[2].strip()
#             password = comp[3].strip()

#             # Get users for this company
#             company_users = [
#                 row[1].strip() for row in users
#                 if len(row) >= 2 and row[0].strip() == company_id
#             ]

#             # Build cache entry
#             temp_cache[username] = {
#                 'password': password,
#                 'company_id': company_id,
#                 'company_name': company_name,
#                 'company_users': company_users,
#             }

#         # Step 4: Replace cache atomically
#         with user_cache_lock:
#             user_cache = temp_cache

#         print(f"[INFO] User cache loaded with {len(user_cache)} companies.")

#     except Exception as e:
#         print(f"[ERROR] Failed to load user cache: {e}")

# # Load cache at startup (you can also schedule periodic reload with threading.Timer or APScheduler)
# load_user_cache()

# print(f"[INFO] User cache initialized.{user_cache_lock}")

import sqlite3

from app.utils.db_utils import fetch_user_by_username, fetch_company_users
from app.utils.performance_utils import measure_performance


# @main_bp.route('/', methods=['GET', 'POST'])
@main_bp.route('/', methods=['GET', 'POST'])
@measure_performance
def login():
    session.clear()
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()

        # Check for super admin login first
        if username == SUPER_ADMIN_USERNAME and password == SUPER_ADMIN_PASSWORD:
            session['username'] = username
            session['role'] = 'super_admin'
            flash("Login successfully.", "success")
            return redirect(url_for('super_admin.super_admin'))

        # Fetch the user data from the database using the utility function
        user_data = fetch_user_by_username(username)

        # Check if user_data exists and fetch company_id properly
        if user_data:
            # print(f"Fetched user data: {user_data}")
            # print(f"Columns in user data: {user_data.keys()}")  
            company_id = user_data['Company ID']  # This works if user_data is a sqlite3.Row
            if company_id and user_data['Password'] == password:
                # Store session data for the logged-in user
                # print(f"User {company_id} authenticated successfully.")
                session['username'] = username
                session['role'] = 'company_admin'
                session['company_id'] = company_id
                session['company_name'] = user_data['Company Name']

                # Fetch users associated with this company
                # print(f"Fetching users for company ID: {company_id}")
                company_users = fetch_company_users(company_id)
                # print(f"Columns in user data: {company_users}")  
                

                # print(f"User {username} logged in with company {user_data['Company Name'], company_id}")

                # If no users exist for this company, redirect to add user page
                if not company_users:
                    return redirect(url_for('company.add_user'))
                flash("Login successfully.", "success")
                return redirect(url_for('admin.dashboard'))
        
        # If user not found or password doesn't match
        return render_template('login.html', error='Invalid credentials')

    return render_template('login.html')
@main_bp.route('/logout')
@measure_performance
def logout():
    # Clear the session and log the user out
    session.clear()
    flash("Logout successfully.", "success")
    return redirect(url_for('main.login'))

