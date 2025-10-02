from flask import Blueprint, render_template
import os


main_bp = Blueprint("device_emulator", __name__)


@main_bp.route("/")
def index():
    default_ws_url = os.environ.get("WS_DEFAULT_URL", "ws://localhost:5003/")
    return render_template("index.html", default_ws_url=default_ws_url)


