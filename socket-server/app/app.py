import asyncio
import os
from typing import Dict, Set, DefaultDict

import websockets
from websockets.server import WebSocketServerProtocol

#
# GroupLoop WebSocket server: ASCII-hex, newline-terminated control protocol
#

# All clients
all_clients: Set[WebSocketServerProtocol] = set()

# Device clients mapped by 2-byte device ID (4 hex chars)
device_clients: Dict[str, WebSocketServerProtocol] = {}

# Non-device clients
non_device_clients: Set[WebSocketServerProtocol] = set()

# Per-connection role: "unknown" | "device" | "client"
client_roles: Dict[WebSocketServerProtocol, str] = {}

# Subscriptions: deviceID -> set of non-device client sockets that should receive sensor lines
subscriptions: DefaultDict[str, Set[WebSocketServerProtocol]] = DefaultDict(set)


def is_hex_string(s: str) -> bool:
    return all(c in '0123456789abcdefABCDEF' for c in s)


def ws_label(ws: WebSocketServerProtocol) -> str:
    try:
        host, port = ws.remote_address[:2]
        return f"{host}:{port}"
    except Exception:
        return "unknown"


async def safe_send(ws: WebSocketServerProtocol, text: str) -> None:
    try:
        await ws.send(text)
    except Exception:
        pass


async def send_to_devices(text: str) -> None:
    if not device_clients:
        return
    coros = [safe_send(ws, text) for ws in list(device_clients.values())]
    await asyncio.gather(*coros, return_exceptions=True)


async def classify_as_device(ws: WebSocketServerProtocol, device_id_hex: str) -> None:
    device_id_hex = device_id_hex.upper()
    # Remove previous owner for this ID if any
    prev = device_clients.get(device_id_hex)
    if prev is not None and prev is not ws:
        try:
            await safe_send(prev, "I\n")
        except Exception:
            pass
    device_clients[device_id_hex] = ws
    client_roles[ws] = "device"
    non_device_clients.discard(ws)


async def classify_as_client(ws: WebSocketServerProtocol) -> None:
    client_roles[ws] = "client"
    non_device_clients.add(ws)


async def handle_client_command(ws: WebSocketServerProtocol, line: str) -> None:
    # All commands are ASCII, newline-terminated; we receive single line here
    if not line:
        return
    cmd = line[0]
    if cmd == 'L' and len(line) == 1:
        # List all known devices, one per line, end with extra newline
        ids = sorted(device_clients.keys())
        payload = ("\n".join(ids) + "\n") if ids else "\n"
        print(f"Listing devices: {payload}")
        await safe_send(ws, payload)
        return
    if cmd == 'I' and len(line) == 1:
        # Relay to all devices; devices respond with their 2-byte IDs (4 hex chars)
        await send_to_devices("I\n")
        return
    # Commands with device ID
    if len(line) < 5:
        return
    device_id = line[1:5].upper()
    target = device_clients.get(device_id)
    if target is None:
        # Unknown device; ignore silently for now
        return
    if cmd == 'C':
        # Forward full line
        await safe_send(target, line + "\n")
        return
    if cmd == 'M':
        await safe_send(target, line + "\n")
        return
    if cmd == 'R':
        # If only deviceID, it's a one-shot sample request
        if len(line) == 5:
            await safe_send(target, line + "\n")
            return
        # With frequency byte (2 hex chars)
        if len(line) == 7 and is_hex_string(line[5:7]):
            freq_hex = line[5:7].upper()
            await safe_send(target, line + "\n")
            # Manage subscription
            subs = subscriptions[device_id]
            if freq_hex == '00':
                subs.discard(ws)
            else:
                subs.add(ws)
            return


async def route_device_message(ws: WebSocketServerProtocol, line: str) -> None:
    # Device may send its ID in response to I, or sensor lines starting with ID
    if len(line) == 4 and is_hex_string(line):
        await classify_as_device(ws, line)
        return
    # Sensor data line: expect 18 hex chars: id(4)+aX(2)+aY(2)+aZ(2)+rssi4x(2)
    if len(line) == 18 and is_hex_string(line):
        device_id = line[0:4].upper()
        # Forward to subscribers of this device
        if device_id in subscriptions:
            stale: Set[WebSocketServerProtocol] = set()
            coros = []
            for client_ws in list(subscriptions[device_id]):
                coros.append(safe_send(client_ws, line + "\n"))
            results = await asyncio.gather(*coros, return_exceptions=True)
            for client_ws, result in zip(list(subscriptions[device_id]), results):
                if isinstance(result, Exception):
                    stale.add(client_ws)
            if stale:
                for s in stale:
                    subscriptions[device_id].discard(s)
        return


async def handle_websocket_connection(websocket: WebSocketServerProtocol) -> None:
    all_clients.add(websocket)
    client_roles[websocket] = "unknown"
    try:
        # prompt identification from potential devices
        await safe_send(websocket, "I\n")
        async for message in websocket:
            if not isinstance(message, str):
                continue
            text = message.replace("\r", "")
            # Split by newline; ignore empty fragments
            for raw in text.split("\n"):
                line = raw.strip()
                if not line:
                    continue
                role = client_roles.get(websocket, "unknown")
                # If unknown and sends a 4-hex ID, classify as device
                if role == "unknown" and len(line) == 4 and is_hex_string(line):
                    await classify_as_device(websocket, line)
                    continue
                # If unknown and sends a command letter, classify as client
                if role == "unknown" and line[0].isalpha():
                    await classify_as_client(websocket)
                    role = "client"
                if role == "device":
                    await route_device_message(websocket, line)
                else:
                    await handle_client_command(websocket, line)
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass
    finally:
        # Cleanup
        all_clients.discard(websocket)
        role = client_roles.pop(websocket, "unknown")
        if role == "client":
            non_device_clients.discard(websocket)
            # Remove from all subscriptions
            for subs in subscriptions.values():
                subs.discard(websocket)
        elif role == "device":
            # Remove any device id mapping owned by this socket
            for did, owner in list(device_clients.items()):
                if owner is websocket:
                    device_clients.pop(did, None)


async def start_websocket_server(host: str, port: int) -> None:
    async with websockets.serve(handle_websocket_connection, host, port, ping_interval=20, ping_timeout=20):
        await asyncio.Future()


def main() -> None:
    ws_host = os.environ.get("WS_HOST", "0.0.0.0")
    ws_port = int(os.environ.get("WS_PORT", "5000"))
    asyncio.run(start_websocket_server(ws_host, ws_port))


if __name__ == "__main__":
    main()