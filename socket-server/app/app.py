import asyncio
import os
import threading
from typing import Optional

from flask import Flask
import websockets
from websockets.server import WebSocketServerProtocol


#
# Plain WebSocket server (RFC6455) on port 5000
# Simple Flask health endpoint on port 5001
#


async def handle_websocket_connection(websocket: WebSocketServerProtocol) -> None:
    try:
        # Send a greeting similar to previous behavior
        await websocket.send("Connected to GroupLoop WebSocket server")

        async for message in websocket:
            # Basic protocol: respond to "ping" and echo everything else
            if message == "ping":
                await websocket.send("pong")
            else:
                await websocket.send(message)
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass


async def start_websocket_server(host: str, port: int) -> None:
    async with websockets.serve(handle_websocket_connection, host, port, ping_interval=20, ping_timeout=20):
        await asyncio.Future()  # run forever


def start_health_server(host: str, port: int) -> None:
    app = Flask(__name__)

    @app.get("/health")
    def health() -> tuple[dict, int]:
        return {"status": "ok"}, 200

    app.run(host=host, port=port, debug=False, use_reloader=False)


def main() -> None:
    ws_host = os.environ.get("WS_HOST", "0.0.0.0")
    ws_port = int(os.environ.get("WS_PORT", "5000"))
    http_host = os.environ.get("HTTP_HOST", "0.0.0.0")
    http_port = int(os.environ.get("HTTP_PORT", "5001"))

    # Start health HTTP server in a background thread
    health_thread = threading.Thread(target=start_health_server, args=(http_host, http_port), daemon=True)
    health_thread.start()

    # Run WebSocket server on the main thread's event loop
    asyncio.run(start_websocket_server(ws_host, ws_port))


if __name__ == "__main__":
    main()