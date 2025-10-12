import asyncio
import json
import os
from typing import Optional, Set, Dict

import websockets
from websockets.server import WebSocketServerProtocol

subscribers: Set[WebSocketServerProtocol] = set()
client_labels: Dict[WebSocketServerProtocol, str] = {}
devices: Dict[str, WebSocketServerProtocol] = {}  # device_id -> websocket

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

async def send_to_device(device_id: str, message: str) -> bool:
    """Send a message to a specific device by device ID"""
    if device_id in devices:
        try:
            await devices[device_id].send(message)
            print(f"[SEND] {device_id}: {message}", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Failed to send to {device_id}: {e}", flush=True)
            # Remove stale device connection
            devices.pop(device_id, None)
            return False
    else:
        print(f"[ERROR] Device {device_id} not found", flush=True)
        return False

async def send_to_all_devices(message: str) -> int:
    """Send a message to all connected devices"""
    if not devices:
        return 0
    
    sent_count = 0
    stale_devices = []
    
    for device_id, ws in devices.items():
        try:
            await ws.send(message)
            sent_count += 1
            print(f"[BROADCAST] {device_id}: {message}", flush=True)
        except Exception as e:
            print(f"[ERROR] Failed to send to {device_id}: {e}", flush=True)
            stale_devices.append(device_id)
    
    # Remove stale device connections
    for device_id in stale_devices:
        devices.pop(device_id, None)
    
    return sent_count

# Utility functions for common device commands
async def set_device_led(device_id: str, color: str) -> bool:
    """Set LED color for a specific device"""
    return await send_to_device(device_id, f"led:{color}")

async def set_all_devices_led(color: str) -> int:
    """Set LED color for all devices"""
    return await send_to_all_devices(f"led:{color}")

async def vibrate_device(device_id: str, duration: int) -> bool:
    """Vibrate a specific device for specified duration in ms"""
    return await send_to_device(device_id, f"vibrate:{duration}")

async def vibrate_all_devices(duration: int) -> int:
    """Vibrate all devices for specified duration in ms"""
    return await send_to_all_devices(f"vibrate:{duration}")

async def get_device_status(device_id: str) -> bool:
    """Request status from a specific device"""
    return await send_to_device(device_id, "status")

async def get_all_devices_status() -> int:
    """Request status from all devices"""
    return await send_to_all_devices("status")

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
            elif isinstance(message, str) and message.startswith("cmd:"):
                # Handle command messages: cmd:device_id:command
                # e.g., "cmd:1234:led:ff0000" or "cmd:all:vibrate:1000"
                try:
                    parts = message[4:].split(":", 2)  # Remove "cmd:" and split
                    if len(parts) >= 2:
                        target = parts[0]  # device_id or "all"
                        command = parts[1]  # the actual command
                        
                        if target == "all":
                            sent_count = await send_to_all_devices(command)
                            await websocket.send(f"cmd:result:sent_to_{sent_count}_devices")
                        else:
                            success = await send_to_device(target, command)
                            await websocket.send(f"cmd:result:{'success' if success else 'failed'}")
                    else:
                        await websocket.send("cmd:error:invalid_format")
                except Exception as e:
                    await websocket.send(f"cmd:error:{str(e)}")
            else:
                # Handle device registration and hex frames
                try:
                    text = str(message).strip()
                    if text:
                        parts = [p for p in text.splitlines() if p]
                        for p in parts:
                            hp = p.strip()
                            if len(hp) == 20 and all(c in '0123456789abcdefABCDEF' for c in hp):
                                # Extract device ID from first 4 characters
                                device_id = hp[:4].lower()
                                # Register this websocket as a device
                                devices[device_id] = websocket
                                # Broadcast to subscribers
                                await broadcast_to_subscribers(hp.lower() + "\n")
                except Exception:
                    pass
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass
    finally:
        subscribers.discard(websocket)
        label = client_labels.pop(websocket, default_label(websocket))
        
        # Remove device from registry if it was registered
        devices_to_remove = [device_id for device_id, ws in devices.items() if ws == websocket]
        for device_id in devices_to_remove:
            devices.pop(device_id, None)
            print(f"[DEVICE_DISCONNECT] {device_id}", flush=True)
        
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