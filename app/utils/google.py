# Functions to connect to Google Sheets with graceful local fallback
import json
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Safely import Google API client if available
try:
    from googleapiclient.discovery import build
    from google.oauth2.service_account import Credentials
except ImportError:
    build = None
    Credentials = None

def get_service():
    """
    Connect to Google Sheets API if credentials are provided.
    Falls back gracefully to None for local SQLite development.
    """
    if not build or not Credentials:
        logger.info("Google API client not installed. Running in local SQLite mode.")
        return None

    creds_raw = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if not creds_raw or creds_raw.strip() in ("", "{}"):
        logger.info("No Google credentials configured. Running in local SQLite mode.")
        return None

    try:
        creds_dict = json.loads(creds_raw)
        if not creds_dict or "type" not in creds_dict:
            logger.info("Empty Google credentials. Running in local SQLite mode.")
            return None
        creds = Credentials.from_service_account_info(
            creds_dict,
            scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        logger.warning(f"Could not initialize Google Sheets service ({e}). Running in local SQLite mode.")
        return None

service = get_service()

def safe_api_call(api_call):
    """
    Safely executes an API call with fallback if Google service is unavailable.
    """
    if api_call is None:
        return {}
    try:
        import time
        time.sleep(1)  # Rate limit buffer
        return api_call.execute()
    except Exception as e:
        logger.warning(f"safe_api_call skipped or failed: {e}")
        return {}
