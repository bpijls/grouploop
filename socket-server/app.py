import os
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev")

# Comma-separated list of origins, defaults to '*'
cors_origins = os.environ.get("CORS_ORIGINS", "*")
socketio = SocketIO(app, cors_allowed_origins=cors_origins, async_mode="eventlet")


@app.get("/health")
def health() -> tuple[dict, int]:
    return {"status": "ok"}, 200


@socketio.on("connect")
def handle_connect():
    emit("server_message", {"message": "Connected to GroupLoop socket server"}, to=request.sid)


@socketio.on("disconnect")
def handle_disconnect():
    # No-op for now, but Flask-SocketIO logs the disconnect
    pass


@socketio.on("ping")
def handle_ping(data=None):
    # Respond with a basic pong (echoes payload if provided)
    emit("pong", data if data is not None else {"message": "pong"})


@socketio.on("echo")
def handle_echo(data):
    # Echo the received data back to the sender
    emit("echo", data)


@socketio.on("join")
def on_join(data):
    room = (data or {}).get("room")
    if room:
        join_room(room)
        emit("server_message", {"message": f"Joined room {room}"})


@socketio.on("leave")
def on_leave(data):
    room = (data or {}).get("room")
    if room:
        leave_room(room)
        emit("server_message", {"message": f"Left room {room}"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("DEBUG", "").lower() in ("1", "true", "yes", "on")
    socketio.run(app, host=host, port=port, debug=debug)


