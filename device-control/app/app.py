from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

# Configuration
DEFAULT_WS_URL = os.environ.get('DEFAULT_WS_URL', 'ws://localhost:5003/')
CDN_BASE_URL = os.environ.get('CDN_BASE_URL', 'http://localhost:5000')

@app.route('/')
def index():
    return render_template('index.html', 
                         default_ws_url=DEFAULT_WS_URL,
                         cdn_base_url=CDN_BASE_URL)

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'device-control'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
