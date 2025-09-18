import asyncio
import json
import os
from typing import Optional, Set

import websockets
from websockets.server import WebSocketServerProtocol

#
# Plain WebSocket server (RFC6455) on port 5000
#

subscribers: Set[WebSocketServerProtocol] = set()

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

        async for message in websocket:
            # Basic protocol: respond to "ping" and echo everything else
            if message == "ping":
                await websocket.send("pong")
            elif message == "s":
                subscribers.add(websocket)
                await websocket.send("stream:on")
            else:
                # Try to parse accelerometer JSON {"ax":..., "ay":..., "az":...}
                handled = False
                try:
                    data = json.loads(message)
                    if isinstance(data, dict) and all(k in data for k in ("ax", "ay", "az")):
                        # Forward raw message to all subscribers
                        await broadcast_to_subscribers(message)
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