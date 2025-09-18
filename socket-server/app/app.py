import asyncio
import json
import os
from typing import Optional, Set, Dict

import websockets
from websockets.server import WebSocketServerProtocol

#
# Plain WebSocket server (RFC6455) on port 5000
#

subscribers: Set[WebSocketServerProtocol] = set()
client_labels: Dict[WebSocketServerProtocol, str] = {}

def default_label(ws: WebSocketServerProtocol) -> str:
    try:
        host, port = ws.remote_address[:2]
        return f"{host}:{port}"
    except Exception:
        return "unknown"

async def broadcast_to_subscribers(message: str) -> None:
    if not subscribers:
        return
    stale: Set[WebSocketServerProtocol] = set()
    send_coroutines = []
    for ws in subscribers:
        send_coroutines.append(ws.send(message))
    results = await asyncio.gather(*send_coroutines, return_exceptions=True)
    for ws, result in zip(list(subscribers), results):
        if isinstance(result, Exception):
            stale.add(ws)
    if stale:
        for ws in stale:
            subscribers.discard(ws)
async def handle_websocket_connection(websocket: WebSocketServerProtocol) -> None:
    try:
        # Send a greeting similar to previous behavior
        await websocket.send("Connected to GroupLoop WebSocket server")
        # Assign default label based on remote address
        client_labels[websocket] = default_label(websocket)
        print(f"[CONNECT] {client_labels[websocket]}", flush=True)

        async for message in websocket:
            # Basic protocol: respond to "ping" and echo everything else
            if message == "ping":
                await websocket.send("pong")
            elif isinstance(message, str) and message.startswith("id:"):
                label = message[3:].strip()
                if label:
                    client_labels[websocket] = label
                    await websocket.send("id:ok")
                else:
                    await websocket.send("id:error")
            elif message == "s":
                subscribers.add(websocket)
                await websocket.send("stream:on")
            else:
                # Try to parse accelerometer JSON {"ax":..., "ay":..., "az":...}
                handled = False
                try:
                    data = json.loads(message)
                    if isinstance(data, dict):
                        if "id" in data and isinstance(data["id"], str) and data["id"].strip():
                            client_labels[websocket] = data["id"].strip()
                            data = {k: v for k, v in data.items() if k != "id"}

                        if all(k in data for k in ("ax", "ay", "az")):
                            outgoing = {
                                "device": client_labels.get(websocket, default_label(websocket)),
                                **data,
                            }
                            await broadcast_to_subscribers(json.dumps(outgoing))
                            handled = True
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass

                if not handled:
                    # Echo original message to maintain existing behavior
                    await websocket.send(message)
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass
    finally:
        subscribers.discard(websocket)
        label = client_labels.pop(websocket, default_label(websocket))
        print(f"[DISCONNECT] {label}", flush=True)


async def start_websocket_server(host: str, port: int) -> None:
    async with websockets.serve(handle_websocket_connection, host, port, ping_interval=20, ping_timeout=20):
        await asyncio.Future()  # run forever


def main() -> None:
    ws_host = os.environ.get("WS_HOST", "0.0.0.0")
    ws_port = int(os.environ.get("WS_PORT", "5000"))

    # Run WebSocket server on the main thread's event loop
    asyncio.run(start_websocket_server(ws_host, ws_port))


if __name__ == "__main__":
    main()