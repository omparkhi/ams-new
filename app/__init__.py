from flask import Flask
from app.main.routes import main_bp
from app.admin.routes import admin_bp
from app.super_admin.routes import super_admin_bp
from app.user.routes import user_bp
from app.company.routes import company_bp

def create_app():
    app = Flask(__name__)
    app.secret_key = 'your-secret-key'

    # Register Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(super_admin_bp, url_prefix='/super_admin')
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(company_bp, url_prefix='/company')

    return app
