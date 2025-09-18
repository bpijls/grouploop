import asyncio
import json
import os
from typing import Optional

import websockets
from websockets.server import WebSocketServerProtocol

#
# Plain WebSocket server (RFC6455) on port 5000
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
                # Try to parse accelerometer JSON {"ax":..., "ay":..., "az":...}
                printed = False
                try:
                    data = json.loads(message)
                    if isinstance(data, dict) and all(k in data for k in ("ax", "ay", "az")):
                        ax = data.get("ax")
                        ay = data.get("ay")
                        az = data.get("az")
                        print(f"[ACCEL] ax={ax:.3f}g ay={ay:.3f}g az={az:.3f}g")
                        printed = True
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass

                if not printed:
                    print(f"[MSG] {message}")
                # Echo original message to maintain existing behavior
                await websocket.send(message)
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass


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