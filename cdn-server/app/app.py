from flask import Flask, send_from_directory
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
JS_DIR = os.path.join(STATIC_DIR, "js")
FIRMWARE_DIR = os.path.join(STATIC_DIR, "firmware")


app = Flask(__name__, static_folder="static")


@app.route("/")
def index():
    return {
        "service": "cdn-server",
        "endpoints": [
            "/js/<filename>",
            "/firmware/<filename>",
            "/static/<path>",
        ],
    }


@app.route("/js/<path:filename>")
def serve_js(filename: str):
    return send_from_directory(JS_DIR, filename)


@app.route("/firmware/<path:filename>")
def serve_firmware(filename: str):
    return send_from_directory(FIRMWARE_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


