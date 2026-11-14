import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from app.api import api_bp
from app.utils.db_utils import init_db_schema

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('FLASK_SECRET_KEY', 'ams-secret-key-production-2026')

    # Allow up to 64MB payloads to support 20-frame camera burst biometric capture
    app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024

    # Enable CORS for React frontend (supports localhost, vercel.app domains, and wildcard)
    CORS(app, resources={r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "supports_credentials": False
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

    # Root health & service status endpoint
    @app.route('/')
    def root_status():
        return jsonify({
            'status': 'online',
            'service': 'AMS Cloud SaaS API',
            'version': '2.0.0',
            'api_docs': '/api'
        })

    # Ensure database schema is initialized with shift columns & tables
    init_db_schema()

    # Register Modern SaaS REST API Blueprint
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(api_bp, name='api_root_bp')

    return app

