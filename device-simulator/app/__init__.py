from flask import Flask


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")

    from .views import main_bp
    app.register_blueprint(main_bp)

    return app


