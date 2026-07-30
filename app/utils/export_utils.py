# app/utils/export_utils.py

import os
import sqlite3
import pandas as pd
from app.utils.google import service, safe_api_call
from dotenv import load_dotenv

load_dotenv()
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")

def export_all_company_sheets_to_sqlite(sqlite_path="attendance_data.db"):
    os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
    conn = sqlite3.connect(sqlite_path)
    try:
        spreadsheet = safe_api_call(service.spreadsheets().get(spreadsheetId=SHEET_ID))
        sheets = spreadsheet.get('sheets', [])
        for sheet in sheets:
            sheet_title = sheet.get('properties', {}).get('title')

            result = safe_api_call(service.spreadsheets().values().get(
                spreadsheetId=SHEET_ID,
                range=f'{sheet_title}!A1:Z'
            ))
            values = result.get('values', [])
            if not values:
                continue

            headers = values[0]
            rows = values[1:]

            normalized_rows = []
            for row in rows:
                if len(row) < len(headers):
                    row += [''] * (len(headers) - len(row))
                elif len(row) > len(headers):
                    row = row[:len(headers)]
                normalized_rows.append(row)

            df = pd.DataFrame(normalized_rows, columns=headers)

            table_name = sheet_title.replace(" ", "_").replace("-", "_")
            df.to_sql(table_name, conn, if_exists='replace', index=False)
            print(f"[Export] Sheet '{sheet_title}' exported as table '{table_name}'")
    except Exception as e:
        print(f"[Export Error] {e}")
    finally:
        conn.close()
