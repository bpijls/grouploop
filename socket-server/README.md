# GroupLoop Socket Server (Flask-SocketIO)

Lightweight Flask-SocketIO server with basic events and health check. Packaged for Docker.

## Features

- Health endpoint at `/health`
- Socket.IO events: `connect`, `disconnect`, `ping` → `pong`, `echo`, `join`, `leave`
- CORS configured via `CORS_ORIGINS` (comma-separated, defaults to `*`)

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Environment variables:

- `SECRET_KEY` (optional)
- `CORS_ORIGINS` (optional, default `*`)
- `HOST` (default `0.0.0.0`)
- `PORT` (default `5000`)
- `DEBUG` (set to `1` to enable)

## Docker

Build image:

```bash
docker build -t grouploop-socket-server .
```

Run container:

```bash
docker run --rm -p 5000:5000 \
  -e CORS_ORIGINS="*" \
  --name grouploop-socket grouploop-socket-server
```

Health check:

```bash
curl http://localhost:5000/health
```

## Example client (JavaScript)

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("connected", socket.id);
  socket.emit("ping", { t: Date.now() });
});

socket.on("pong", (data) => console.log("pong", data));
socket.on("echo", (data) => console.log("echo", data));
socket.on("server_message", (msg) => console.log(msg));

// rooms
socket.emit("join", { room: "test" });
socket.emit("leave", { room: "test" });
```


