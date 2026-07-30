# Functions to connect to Google Sheets
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import json
import os
from dotenv import load_dotenv

load_dotenv()

def get_service():
    creds_dict = json.loads(os.getenv("GOOGLE_CREDENTIALS_JSON"))
    creds = Credentials.from_service_account_info(creds_dict, scopes=['https://www.googleapis.com/auth/spreadsheets'])
    return build('sheets', 'v4', credentials=creds)

service = get_service()

def safe_api_call(api_call):
    import time
    time.sleep(1)  # Add a 1-second delay to avoid rate limiting
    return api_call.execute()
