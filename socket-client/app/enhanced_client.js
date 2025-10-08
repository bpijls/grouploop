// Enhanced WebSocket client for device management and control
class DeviceManagerClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.devices = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000;
        
        // Event callbacks
        this.onDeviceUpdate = null;
        this.onDeviceData = null;
        this.onConnectionChange = null;
    }
    
    connect() {
        try {
            console.log(`Connecting to WebSocket server: ${this.wsUrl}`);
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = (event) => {
                console.log('Connected to WebSocket server');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(true);
                }
                
                // Request current device list
                this.sendMessage({
                    type: 'get_device_list'
                });
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket connection closed');
                this.isConnected = false;
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(false);
                }
                
                // Attempt reconnection
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.attemptReconnect();
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }
    
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not connected, cannot send message');
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'device_list':
                this.handleDeviceList(data.devices);
                break;
                
            case 'device_list_update':
                this.handleDeviceListUpdate(data.devices);
                break;
                
            case 'device_data':
                this.handleDeviceData(data.data);
                break;
                
            case 'command_response':
                this.handleCommandResponse(data);
                break;
                
            case 'pong':
                console.log('Received pong from server');
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    handleDeviceList(devices) {
        console.log('Received device list:', devices);
        this.devices.clear();
        
        devices.forEach(device => {
            this.devices.set(device.device_id, device);
        });
        
        if (this.onDeviceUpdate) {
            this.onDeviceUpdate(Array.from(this.devices.values()));
        }
    }
    
    handleDeviceListUpdate(devices) {
        console.log('Device list updated:', devices);
        this.devices.clear();
        
        devices.forEach(device => {
            this.devices.set(device.device_id, device);
        });
        
        if (this.onDeviceUpdate) {
            this.onDeviceUpdate(Array.from(this.devices.values()));
        }
    }
    
    handleDeviceData(deviceData) {
        console.log('Received device data:', deviceData);
        
        if (this.onDeviceData) {
            this.onDeviceData(deviceData);
        }
    }
    
    handleCommandResponse(response) {
        console.log('Command response:', response);
        
        if (response.success) {
            console.log(`Command sent successfully to ${response.targetDevice}`);
        } else {
            console.error(`Failed to send command to ${response.targetDevice}`);
        }
    }
    
    // Command methods
    sendLEDCommand(deviceId, behavior, color = '#FF0000', duration = 5000) {
        const command = {
            type: 'command',
            targetDevice: deviceId,
            commandType: 'led',
            commandData: {
                behavior: behavior,
                color: color,
                duration: duration
            }
        };
        
        console.log(`Sending LED command to ${deviceId}:`, command);
        this.sendMessage(command);
    }
    
    sendVibrationCommand(deviceId, pattern, intensity = 0.8, duration = 3000) {
        const command = {
            type: 'command',
            targetDevice: deviceId,
            commandType: 'vibration',
            commandData: {
                pattern: pattern,
                intensity: intensity,
                duration: duration
            }
        };
        
        console.log(`Sending vibration command to ${deviceId}:`, command);
        this.sendMessage(command);
    }
    
    broadcastLEDCommand(behavior, color = '#FF0000', duration = 5000) {
        const command = {
            type: 'command',
            targetDevice: 'all',
            commandType: 'led',
            commandData: {
                behavior: behavior,
                color: color,
                duration: duration
            }
        };
        
        console.log('Broadcasting LED command to all devices:', command);
        this.sendMessage(command);
    }
    
    broadcastVibrationCommand(pattern, intensity = 0.8, duration = 3000) {
        const command = {
            type: 'command',
            targetDevice: 'all',
            commandType: 'vibration',
            commandData: {
                pattern: pattern,
                intensity: intensity,
                duration: duration
            }
        };
        
        console.log('Broadcasting vibration command to all devices:', command);
        this.sendMessage(command);
    }
    
    ping() {
        this.sendMessage({ type: 'ping' });
    }
    
    // Utility methods
    getDevices() {
        return Array.from(this.devices.values());
    }
    
    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }
    
    isDeviceConnected(deviceId) {
        const device = this.devices.get(deviceId);
        return device && device.status === 'connected';
    }
}

// Example usage and UI integration
class DeviceControlUI {
    constructor(wsUrl) {
        this.client = new DeviceManagerClient(wsUrl);
        this.setupEventHandlers();
        this.setupUI();
    }
    
    setupEventHandlers() {
        this.client.onConnectionChange = (connected) => {
            this.updateConnectionStatus(connected);
        };
        
        this.client.onDeviceUpdate = (devices) => {
            this.updateDeviceList(devices);
        };
        
        this.client.onDeviceData = (deviceData) => {
            this.updateDeviceData(deviceData);
        };
    }
    
    setupUI() {
        // Create basic UI elements
        this.createUI();
    }
    
    createUI() {
        const container = document.getElementById('device-control-container') || document.body;
        
        container.innerHTML = `
            <div id="device-control-panel">
                <h2>Device Control Panel</h2>
                
                <div id="connection-status">
                    <span id="status-indicator">●</span>
                    <span id="status-text">Disconnected</span>
                </div>
                
                <div id="device-list">
                    <h3>Connected Devices</h3>
                    <div id="devices-container"></div>
                </div>
                
                <div id="device-data">
                    <h3>Device Data</h3>
                    <div id="data-container"></div>
                </div>
                
                <div id="control-panel">
                    <h3>Device Control</h3>
                    <div id="controls-container"></div>
                </div>
            </div>
        `;
        
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #device-control-panel {
                font-family: Arial, sans-serif;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            #connection-status {
                margin-bottom: 20px;
                padding: 10px;
                border-radius: 5px;
                background-color: #f0f0f0;
            }
            
            #status-indicator {
                color: #ff0000;
                font-size: 20px;
                margin-right: 10px;
            }
            
            #status-indicator.connected {
                color: #00ff00;
            }
            
            .device-card {
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 15px;
                margin: 10px 0;
                background-color: #f9f9f9;
            }
            
            .device-card h4 {
                margin: 0 0 10px 0;
                color: #333;
            }
            
            .device-info {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
            }
            
            .device-controls {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .control-button {
                padding: 8px 16px;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .led-control {
                background-color: #4CAF50;
                color: white;
            }
            
            .vibration-control {
                background-color: #2196F3;
                color: white;
            }
            
            .data-display {
                background-color: #f0f0f0;
                padding: 10px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 12px;
                white-space: pre-wrap;
            }
        `;
        document.head.appendChild(style);
    }
    
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }
    
    updateDeviceList(devices) {
        const container = document.getElementById('devices-container');
        container.innerHTML = '';
        
        devices.forEach(device => {
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <h4>${device.device_id}</h4>
                <div class="device-info">
                    Type: ${device.device_type}<br>
                    IP: ${device.ip_address}<br>
                    Capabilities: ${device.capabilities.join(', ')}<br>
                    Last Seen: ${new Date(device.last_seen).toLocaleString()}
                </div>
                <div class="device-controls">
                    <button class="control-button led-control" onclick="ui.sendLEDCommand('${device.device_id}', 'pulse')">
                        LED Pulse
                    </button>
                    <button class="control-button led-control" onclick="ui.sendLEDCommand('${device.device_id}', 'solid')">
                        LED Solid
                    </button>
                    <button class="control-button vibration-control" onclick="ui.sendVibrationCommand('${device.device_id}', 'pulse')">
                        Vibrate
                    </button>
                </div>
            `;
            container.appendChild(deviceCard);
        });
    }
    
    updateDeviceData(deviceData) {
        const container = document.getElementById('data-container');
        const dataDisplay = document.createElement('div');
        dataDisplay.className = 'data-display';
        dataDisplay.textContent = JSON.stringify(deviceData, null, 2);
        container.appendChild(dataDisplay);
        
        // Keep only last 10 data entries
        const entries = container.children;
        if (entries.length > 10) {
            container.removeChild(entries[0]);
        }
    }
    
    // Public methods for button callbacks
    sendLEDCommand(deviceId, behavior, color, duration) {
        this.client.sendLEDCommand(deviceId, behavior, color, duration);
    }
    
    sendVibrationCommand(deviceId, pattern, intensity, duration) {
        this.client.sendVibrationCommand(deviceId, pattern, intensity, duration);
    }
    
    connect() {
        this.client.connect();
    }
    
    disconnect() {
        this.client.disconnect();
    }
}

// Global instance for button callbacks
let ui;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const wsUrl = 'ws://localhost:5003';
    ui = new DeviceControlUI(wsUrl);
    ui.connect();
});
