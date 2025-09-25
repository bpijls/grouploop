from flask import Flask, render_template
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/")
def index():
    default_ws_url = os.environ.get("WS_DEFAULT_URL", "ws://localhost:5003/")
    return render_template("index.html", default_ws_url=default_ws_url)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
