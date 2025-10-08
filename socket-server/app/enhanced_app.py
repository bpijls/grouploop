import asyncio
import json
import os
from typing import Optional, Set, Dict, List
from dataclasses import dataclass, asdict
from datetime import datetime

import websockets
from websockets.server import WebSocketServerProtocol

@dataclass
class DeviceInfo:
    device_id: str
    device_type: str
    capabilities: List[str]
    last_seen: datetime
    websocket: WebSocketServerProtocol
    ip_address: str
    status: str = "connected"

@dataclass
class DeviceData:
    device_id: str
    timestamp: int
    imu: Dict[str, float]
    beacons: Dict[str, int]

class DeviceManager:
    def __init__(self):
        self.devices: Dict[str, DeviceInfo] = {}
        self.web_clients: Set[WebSocketServerProtocol] = set()
        self.device_data_history: Dict[str, List[DeviceData]] = {}
        
    def register_device(self, websocket: WebSocketServerProtocol, device_id: str, 
                       device_type: str, capabilities: List[str]) -> bool:
        """Register a new device connection"""
        try:
            ip_address = websocket.remote_address[0] if websocket.remote_address else "unknown"
            
            device_info = DeviceInfo(
                device_id=device_id,
                device_type=device_type,
                capabilities=capabilities,
                last_seen=datetime.now(),
                websocket=websocket,
                ip_address=ip_address
            )
            
            self.devices[device_id] = device_info
            self.device_data_history[device_id] = []
            
            print(f"[DEVICE_REGISTERED] {device_id} ({device_type}) from {ip_address}")
            print(f"  Capabilities: {', '.join(capabilities)}")
            
            # Notify web clients about new device
            self.notify_web_clients_device_update()
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to register device {device_id}: {e}")
            return False
    
    def unregister_device(self, device_id: str):
        """Unregister a device when it disconnects"""
        if device_id in self.devices:
            device_info = self.devices[device_id]
            print(f"[DEVICE_UNREGISTERED] {device_id} from {device_info.ip_address}")
            
            del self.devices[device_id]
            # Keep data history for potential analysis
            
            # Notify web clients about device removal
            self.notify_web_clients_device_update()
    
    def update_device_data(self, device_id: str, data: DeviceData):
        """Update device data and store in history"""
        if device_id in self.devices:
            self.devices[device_id].last_seen = datetime.now()
            
            # Store in history (keep last 100 entries per device)
            if device_id in self.device_data_history:
                self.device_data_history[device_id].append(data)
                if len(self.device_data_history[device_id]) > 100:
                    self.device_data_history[device_id].pop(0)
            
            # Broadcast to web clients
            self.broadcast_to_web_clients(data)
    
    def send_command_to_device(self, device_id: str, command: Dict) -> bool:
        """Send a command to a specific device"""
        if device_id in self.devices:
            try:
                device_info = self.devices[device_id]
                message = json.dumps(command)
                asyncio.create_task(device_info.websocket.send(message))
                print(f"[COMMAND_SENT] To {device_id}: {command}")
                return True
            except Exception as e:
                print(f"[ERROR] Failed to send command to {device_id}: {e}")
                return False
        else:
            print(f"[ERROR] Device {device_id} not found")
            return False
    
    def broadcast_to_all_devices(self, command: Dict) -> int:
        """Broadcast a command to all connected devices"""
        sent_count = 0
        for device_id in list(self.devices.keys()):
            if self.send_command_to_device(device_id, command):
                sent_count += 1
        print(f"[BROADCAST] Sent command to {sent_count} devices")
        return sent_count
    
    def add_web_client(self, websocket: WebSocketServerProtocol):
        """Add a web client for data visualization"""
        self.web_clients.add(websocket)
        print(f"[WEB_CLIENT_CONNECTED] {websocket.remote_address}")
        
        # Send current device list to new web client
        self.send_device_list_to_client(websocket)
    
    def remove_web_client(self, websocket: WebSocketServerProtocol):
        """Remove a web client"""
        self.web_clients.discard(websocket)
        print(f"[WEB_CLIENT_DISCONNECTED] {websocket.remote_address}")
    
    def broadcast_to_web_clients(self, data: DeviceData):
        """Broadcast device data to all web clients"""
        if not self.web_clients:
            return
            
        message = json.dumps({
            "type": "device_data",
            "data": asdict(data)
        })
        
        # Send to all web clients
        disconnected_clients = set()
        for client in self.web_clients:
            try:
                asyncio.create_task(client.send(message))
            except Exception:
                disconnected_clients.add(client)
        
        # Remove disconnected clients
        for client in disconnected_clients:
            self.web_clients.discard(client)
    
    def notify_web_clients_device_update(self):
        """Notify web clients about device list changes"""
        if not self.web_clients:
            return
            
        device_list = []
        for device_id, device_info in self.devices.items():
            device_list.append({
                "device_id": device_id,
                "device_type": device_info.device_type,
                "capabilities": device_info.capabilities,
                "ip_address": device_info.ip_address,
                "last_seen": device_info.last_seen.isoformat(),
                "status": device_info.status
            })
        
        message = json.dumps({
            "type": "device_list_update",
            "devices": device_list
        })
        
        disconnected_clients = set()
        for client in self.web_clients:
            try:
                asyncio.create_task(client.send(message))
            except Exception:
                disconnected_clients.add(client)
        
        for client in disconnected_clients:
            self.web_clients.discard(client)
    
    def send_device_list_to_client(self, websocket: WebSocketServerProtocol):
        """Send current device list to a specific web client"""
        device_list = []
        for device_id, device_info in self.devices.items():
            device_list.append({
                "device_id": device_id,
                "device_type": device_info.device_type,
                "capabilities": device_info.capabilities,
                "ip_address": device_info.ip_address,
                "last_seen": device_info.last_seen.isoformat(),
                "status": device_info.status
            })
        
        message = json.dumps({
            "type": "device_list",
            "devices": device_list
        })
        
        try:
            asyncio.create_task(websocket.send(message))
        except Exception as e:
            print(f"[ERROR] Failed to send device list: {e}")
    
    def get_device_list(self) -> List[Dict]:
        """Get current device list for API"""
        device_list = []
        for device_id, device_info in self.devices.items():
            device_list.append({
                "device_id": device_id,
                "device_type": device_info.device_type,
                "capabilities": device_info.capabilities,
                "ip_address": device_info.ip_address,
                "last_seen": device_info.last_seen.isoformat(),
                "status": device_info.status
            })
        return device_list

# Global device manager
device_manager = DeviceManager()

async def handle_device_connection(websocket: WebSocketServerProtocol) -> None:
    """Handle connections from devices (scanners, beacons, etc.)"""
    device_id = None
    
    try:
        print(f"[DEVICE_CONNECT] {websocket.remote_address}")
        
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get("type")
                
                if message_type == "device_identification":
                    # Device is identifying itself
                    device_id = data.get("deviceId")
                    device_type = data.get("deviceType", "unknown")
                    capabilities = data.get("capabilities", [])
                    
                    if device_id:
                        device_manager.register_device(websocket, device_id, device_type, capabilities)
                        
                        # Send acknowledgment
                        response = {
                            "type": "device_registered",
                            "deviceId": device_id,
                            "status": "success"
                        }
                        await websocket.send(json.dumps(response))
                    else:
                        await websocket.send(json.dumps({
                            "type": "device_registered",
                            "status": "error",
                            "message": "Missing deviceId"
                        }))
                
                elif message_type == "device_data":
                    # Device is sending sensor data
                    if device_id:
                        device_data = DeviceData(
                            device_id=data.get("deviceId"),
                            timestamp=data.get("timestamp"),
                            imu=data.get("imu", {}),
                            beacons=data.get("beacons", {})
                        )
                        device_manager.update_device_data(device_id, device_data)
                
                elif message_type == "pong":
                    # Device responding to ping
                    if device_id:
                        device_manager.devices[device_id].last_seen = datetime.now()
                
                else:
                    print(f"[UNKNOWN_MESSAGE] From {device_id or 'unknown'}: {message_type}")
                    
            except json.JSONDecodeError:
                print(f"[INVALID_JSON] From {device_id or 'unknown'}: {message}")
            except Exception as e:
                print(f"[ERROR] Processing message from {device_id or 'unknown'}: {e}")
                
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass
    except Exception as e:
        print(f"[ERROR] Device connection error: {e}")
    finally:
        if device_id:
            device_manager.unregister_device(device_id)
        print(f"[DEVICE_DISCONNECT] {device_id or 'unknown'}")

async def handle_web_client_connection(websocket: WebSocketServerProtocol) -> None:
    """Handle connections from web clients (dashboards, control panels)"""
    try:
        print(f"[WEB_CLIENT_CONNECT] {websocket.remote_address}")
        device_manager.add_web_client(websocket)
        
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get("type")
                
                if message_type == "ping":
                    # Respond to ping
                    response = {
                        "type": "pong",
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    }
                    await websocket.send(json.dumps(response))
                
                elif message_type == "command":
                    # Handle command from web client
                    target_device = data.get("targetDevice")
                    command_type = data.get("commandType")
                    command_data = data.get("commandData", {})
                    
                    if target_device == "all":
                        # Broadcast to all devices
                        command = {
                            "type": "command",
                            "commandType": command_type,
                            "commandData": command_data,
                            "timestamp": int(datetime.now().timestamp() * 1000)
                        }
                        device_manager.broadcast_to_all_devices(command)
                    elif target_device:
                        # Send to specific device
                        command = {
                            "type": "command",
                            "commandType": command_type,
                            "commandData": command_data,
                            "timestamp": int(datetime.now().timestamp() * 1000)
                        }
                        success = device_manager.send_command_to_device(target_device, command)
                        
                        # Send response back to web client
                        response = {
                            "type": "command_response",
                            "targetDevice": target_device,
                            "success": success,
                            "timestamp": int(datetime.now().timestamp() * 1000)
                        }
                        await websocket.send(json.dumps(response))
                
                elif message_type == "get_device_list":
                    # Send current device list
                    device_list = device_manager.get_device_list()
                    response = {
                        "type": "device_list",
                        "devices": device_list
                    }
                    await websocket.send(json.dumps(response))
                
                else:
                    print(f"[UNKNOWN_WEB_MESSAGE] {message_type}")
                    
            except json.JSONDecodeError:
                print(f"[INVALID_JSON] From web client: {message}")
            except Exception as e:
                print(f"[ERROR] Processing web client message: {e}")
                
    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError:
        pass
    except Exception as e:
        print(f"[ERROR] Web client connection error: {e}")
    finally:
        device_manager.remove_web_client(websocket)
        print(f"[WEB_CLIENT_DISCONNECT] {websocket.remote_address}")

async def connection_handler(websocket: WebSocketServerProtocol, path: str) -> None:
    """Main connection handler that routes to appropriate handler"""
    try:
        # Wait for first message to determine connection type
        first_message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
        
        try:
            data = json.loads(first_message)
            message_type = data.get("type")
            
            if message_type in ["device_identification", "device_data", "pong"]:
                # This is a device connection
                await handle_device_connection(websocket)
            else:
                # This is a web client connection
                await handle_web_client_connection(websocket)
                
        except json.JSONDecodeError:
            # If not JSON, treat as web client
            await handle_web_client_connection(websocket)
            
    except asyncio.TimeoutError:
        print(f"[TIMEOUT] Connection from {websocket.remote_address} timed out")
        await websocket.close()
    except Exception as e:
        print(f"[ERROR] Connection handler error: {e}")
        await websocket.close()

async def start_websocket_server(host: str, port: int) -> None:
    """Start the WebSocket server"""
    print(f"[SERVER_START] Starting WebSocket server on {host}:{port}")
    print("[SERVER_INFO] Supports device connections and web client connections")
    print("[SERVER_INFO] Device commands are routed to specific devices only")
    
    async with websockets.serve(connection_handler, host, port, ping_interval=20, ping_timeout=20):
        await asyncio.Future()  # run forever

def main() -> None:
    ws_host = os.environ.get("WS_HOST", "0.0.0.0")
    ws_port = int(os.environ.get("WS_PORT", "5003"))

    # Run WebSocket server on the main thread's event loop
    asyncio.run(start_websocket_server(ws_host, ws_port))

if __name__ == "__main__":
    main()
