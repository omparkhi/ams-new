import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from app.main.routes import main_bp
from app.admin.routes import admin_bp
from app.super_admin.routes import super_admin_bp
from app.user.routes import user_bp
from app.company.routes import company_bp
from app.api import api_bp
from app.utils.db_utils import init_db_schema

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('FLASK_SECRET_KEY', 'ams-secret-key-production-2026')

    # Allow up to 64MB payloads to support 20-frame camera burst biometric capture
    app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024

    # Enable CORS for React frontend (Vite on localhost:3000 / localhost:5173)
    CORS(app, resources={r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5000",
            "http://127.0.0.1:5000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "supports_credentials": True
    }})

    # Universal CORS handler to guarantee headers on all responses (including errors)
    @app.after_request
    def set_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept'
            response.headers['Access-Control-Max-Age'] = '86400'
        return response

    # Explicit preflight OPTIONS response for all API routes
    @app.before_request
    def handle_options_preflight():
        if request.method == 'OPTIONS':
            response = app.make_default_options_response()
            origin = request.headers.get('Origin')
            if origin:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept'
                response.headers['Access-Control-Max-Age'] = '86400'
            return response

    # Global error handler with guaranteed CORS headers and clean JSON
    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        app.logger.error(f"Unhandled Exception: {e}", exc_info=True)
        status_code = getattr(e, 'code', 500)
        response = jsonify({'error': str(e)})
        response.status_code = status_code
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept'
        return response

    # Ensure database schema is initialized with shift columns & tables
    init_db_schema()

    # Register Legacy Server-Rendered Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(super_admin_bp, url_prefix='/super_admin')
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(company_bp, url_prefix='/company')

    # Register Modern SaaS REST API Blueprint
    app.register_blueprint(api_bp, url_prefix='/api')

    return app

