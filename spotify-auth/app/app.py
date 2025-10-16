import os
import secrets
import string
import time
from urllib.parse import urlencode

import requests
from flask import Flask, jsonify, redirect, request, make_response
from flask_cors import CORS

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

REQUIRED_SCOPES = " ".join([
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
])


def generate_state(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_app() -> Flask:
    app = Flask(__name__)

    # Config from environment
    app.config.update(
        SPOTIFY_CLIENT_ID=os.environ.get("SPOTIFY_CLIENT_ID", ""),
        SPOTIFY_CLIENT_SECRET=os.environ.get("SPOTIFY_CLIENT_SECRET", ""),
        SPOTIFY_REDIRECT_URI=os.environ.get("SPOTIFY_REDIRECT_URI", "http://localhost:5180/callback"),
        FRONTEND_ORIGIN=os.environ.get("FRONTEND_ORIGIN", "http://localhost:8080"),
        SESSION_SECRET=os.environ.get("SESSION_SECRET", secrets.token_hex(16)),
        COOKIE_DOMAIN=os.environ.get("COOKIE_DOMAIN", None),
    )

    # Allow frontend origin only
    CORS(app, resources={r"/access_token": {"origins": app.config["FRONTEND_ORIGIN"]}}, supports_credentials=True)

    # In-memory session store: session_id -> { refresh_token, access_token, expires_at }
    # For production, replace with Redis/DB
    session_store = {}

    def set_session_cookie(resp, session_id: str):
        resp.set_cookie(
            "sid",
            session_id,
            httponly=True,
            secure=request.headers.get("X-Forwarded-Proto", request.scheme) == "https",
            samesite="Lax",
            domain=app.config["COOKIE_DOMAIN"],
            path="/",
        )

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.get("/login")
    def login():
        state = generate_state()
        # Create a new ephemeral session so we can persist state
        session_id = generate_state(24)
        session_store[session_id] = {"state": state}

        params = {
            "client_id": app.config["SPOTIFY_CLIENT_ID"],
            "response_type": "code",
            "redirect_uri": app.config["SPOTIFY_REDIRECT_URI"],
            "scope": REQUIRED_SCOPES,
            "state": state,
            "show_dialog": "false",
        }
        url = f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"
        resp = make_response(redirect(url))
        set_session_cookie(resp, session_id)
        return resp

    @app.get("/callback")
    def callback():
        code = request.args.get("code")
        state = request.args.get("state")
        session_id = request.cookies.get("sid")
        sess = session_store.get(session_id)
        if not sess or not state or state != sess.get("state"):
            return jsonify({"error": "invalid_state"}), 400

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": app.config["SPOTIFY_REDIRECT_URI"],
            "client_id": app.config["SPOTIFY_CLIENT_ID"],
            "client_secret": app.config["SPOTIFY_CLIENT_SECRET"],
        }
        token_resp = requests.post(SPOTIFY_TOKEN_URL, data=data, timeout=10)
        if token_resp.status_code != 200:
            return jsonify({"error": "token_exchange_failed", "details": token_resp.text}), 400

        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        refresh_token = token_json.get("refresh_token")
        expires_in = token_json.get("expires_in", 3600)
        expires_at = int(time.time()) + int(expires_in) - 30

        session_store[session_id] = {
            "refresh_token": refresh_token,
            "access_token": access_token,
            "expires_at": expires_at,
        }

        # Redirect back to frontend
        frontend = app.config["FRONTEND_ORIGIN"].rstrip("/")
        resp = make_response(redirect(f"{frontend}/"))
        set_session_cookie(resp, session_id)
        return resp

    def refresh_access_token(session_id: str):
        sess = session_store.get(session_id)
        if not sess or not sess.get("refresh_token"):
            return None
        data = {
            "grant_type": "refresh_token",
            "refresh_token": sess["refresh_token"],
            "client_id": app.config["SPOTIFY_CLIENT_ID"],
            "client_secret": app.config["SPOTIFY_CLIENT_SECRET"],
        }
        token_resp = requests.post(SPOTIFY_TOKEN_URL, data=data, timeout=10)
        if token_resp.status_code != 200:
            return None
        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        expires_in = token_json.get("expires_in", 3600)
        sess["access_token"] = access_token
        sess["expires_at"] = int(time.time()) + int(expires_in) - 30
        return access_token

    @app.get("/access_token")
    def access_token_endpoint():
        origin = request.headers.get("Origin")
        if origin != app.config["FRONTEND_ORIGIN"]:
            return jsonify({"error": "forbidden"}), 403
        session_id = request.cookies.get("sid")
        sess = session_store.get(session_id)
        if not sess:
            return jsonify({"error": "not_authenticated"}), 401
        if not sess.get("access_token") or sess.get("expires_at", 0) <= int(time.time()):
            token = refresh_access_token(session_id)
            if not token:
                return jsonify({"error": "refresh_failed"}), 401
        return jsonify({"access_token": sess["access_token"], "expires_at": sess["expires_at"]})

    @app.post("/logout")
    def logout():
        session_id = request.cookies.get("sid")
        if session_id in session_store:
            del session_store[session_id]
        resp = make_response(jsonify({"ok": True}))
        resp.set_cookie("sid", "", expires=0, path="/")
        return resp

    return app


app = create_app()

