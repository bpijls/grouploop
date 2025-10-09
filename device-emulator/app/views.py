from flask import Blueprint, render_template
import os


main_bp = Blueprint("device_emulator", __name__)


@main_bp.route("/")
def index():
    default_ws_url = os.environ.get("WS_DEFAULT_URL", "ws://localhost:5003/")
    cdn_base_url = os.environ.get("CDN_BASE_URL", "http://localhost:5008")
    return render_template("index.html", default_ws_url=default_ws_url, cdn_base_url=cdn_base_url)


