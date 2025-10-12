# GroupLoop Firmware Upload Guide

This guide explains how to flash the GroupLoop firmware to ESP32-C3 devices and configure them for network connectivity.

## Prerequisites

### Hardware Requirements

- **ESP32-C3 Development Board**: Seeed XIAO ESP32-C3 or ESP32-C3-DevKitM-1
- **USB Cable**: For programming and power
- **Computer**: Windows, macOS, or Linux

### Software Requirements

- **PlatformIO**: For firmware compilation and upload
- **Python 3.7+**: Required by PlatformIO
- **Git**: For cloning the repository

## Installation

### 1. Install PlatformIO

#### Option A: PlatformIO Core (CLI)

```bash
# Install Python pip if not already installed
python3 -m pip install --upgrade pip

# Install PlatformIO
pip install platformio

# Verify installation
pio --version
```

#### Option B: PlatformIO IDE (VS Code Extension)

1. Install Visual Studio Code
2. Install the PlatformIO IDE extension
3. Open the firmware project in VS Code

### 2. Install ESP32-C3 Drivers

#### Windows

1. Download CP210x drivers from Silicon Labs
2. Install the drivers
3. Connect the ESP32-C3 board
4. Verify in Device Manager (should appear as COM port)

#### macOS

```bash
# Install using Homebrew
brew install --cask silicon-labs-vcp-driver

# Or download from Silicon Labs website
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3-pip

# The CP210x driver is usually included in the kernel
```

## Firmware Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd grouploop/grouploop-firmware

# Verify project structure
ls -la
```

### 2. Install Dependencies

```bash
# Install project dependencies
pio lib install

# Or install specific libraries
pio lib install "links2004/WebSockets@^2.7.0"
pio lib install "adafruit/Adafruit NeoPixel@^1.15.1"
pio lib install "bblanchon/ArduinoJson@^7.4.2"
```

### 3. Configure Platform

```ini
; platformio.ini
[env:seeed_xiao_esp32c3]
platform = espressif32
board = seeed_xiao_esp32c3
framework = arduino
lib_deps = 
    links2004/WebSockets@^2.7.0
    adafruit/Adafruit NeoPixel@^1.15.1
    bblanchon/ArduinoJson@^7.4.2

upload_port = COM5  ; Windows
; upload_port = /dev/cu.usbmodem*  ; macOS
; upload_port = /dev/ttyUSB0  ; Linux

monitor_port = COM5  ; Windows
; monitor_port = /dev/cu.usbmodem*  ; macOS
; monitor_port = /dev/ttyUSB0  ; Linux

upload_speed = 921600
monitor_speed = 115200
board_build.f_cpu = 160000000L
board_build.flash_mode = qio
board_build.flash_freq = 80m
board_build.partitions = huge_app.csv
board_build.arduino.usb_mode = cdc
board_build.arduino.usb_cdc_on_boot = enable
build_flags = 
    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DCORE_DEBUG_LEVEL=4
```

## Device Configuration

### 1. Default Configuration

The firmware comes with default configuration values:

```cpp
// Default configuration values
const String DEFAULT_WIFI_SSID = "IOT";
const String DEFAULT_WIFI_PASSWORD = "!HVAIOT!";
const String DEFAULT_SOCKET_SERVER_URL = "ws://feib.nl:5003";
const int DEFAULT_LED_PIN = 3;
const int DEFAULT_MOTOR_PIN = 2;
const String DEFAULT_DEVICE_NAME_PREFIX = "HitloopScanner";
```

### 2. Custom Configuration

#### Method 1: Modify Source Code

```cpp
// Edit include/Configuration.h
const String Configuration::DEFAULT_WIFI_SSID = "YourNetwork";
const String Configuration::DEFAULT_WIFI_PASSWORD = "YourPassword";
const String Configuration::DEFAULT_SOCKET_SERVER_URL = "ws://your-server:5003";
```

#### Method 2: Runtime Configuration

The device can be configured at runtime via WebSocket commands:

```json
{
  "wifiSSID": "YourNetwork",
  "wifiPassword": "YourPassword",
  "socketServerURL": "ws://your-server:5003",
  "LEDPin": 3,
  "motorPin": 2,
  "deviceNamePrefix": "YourDevice"
}
```

## Firmware Upload

### 1. Connect Device

```bash
# Connect ESP32-C3 via USB
# Verify connection
pio device list
```

### 2. Compile Firmware

```bash
# Compile for specific environment
pio run -e seeed_xiao_esp32c3

# Or compile for all environments
pio run
```

### 3. Upload Firmware

```bash
# Upload to device
pio run -e seeed_xiao_esp32c3 -t upload

# Upload and monitor serial output
pio run -e seeed_xiao_esp32c3 -t upload -t monitor
```

### 4. Monitor Serial Output

```bash
# Monitor serial output
pio device monitor -e seeed_xiao_esp32c3

# Or use specific port
pio device monitor --port COM5 --baud 115200
```

## Device Setup Process

### 1. Initial Boot

After uploading firmware, the device will:

1. **Initialize**: Load configuration from NVS
2. **WiFi Connection**: Attempt to connect to configured network
3. **LED Status**: Red breathing = WiFi disconnected, Random color = WiFi connected
4. **WebSocket Connection**: Connect to configured server
5. **BLE Scanning**: Start scanning for beacons (after WiFi connection)

### 2. Serial Monitor Output

```
Starting setup
Configuration loaded from NVS
WiFi connected - starting BLE process
LED changed to random color: 0x00FF00 (WiFi connected) - Green
WebSocket connected to ws://your-server:5003
Device registered with ID: 1234
BLE process started
```

### 3. Configuration Mode

The device enters configuration mode when:

- Configuration button is pressed
- Configuration command is received
- WiFi connection fails

In configuration mode:
- LED blinks rapidly
- Other processes are halted
- Device accepts configuration updates
- Mode times out after 30 seconds

## Network Configuration

### 1. WiFi Setup

#### Automatic Configuration

```bash
# Send configuration via WebSocket
echo '{"wifiSSID":"YourNetwork","wifiPassword":"YourPassword"}' | \
websocat ws://device-ip:5003
```

#### Manual Configuration

1. Connect to device's serial monitor
2. Send configuration command:
   ```
   config:{"wifiSSID":"YourNetwork","wifiPassword":"YourPassword"}
   ```

### 2. Server Configuration

```bash
# Configure WebSocket server URL
echo '{"socketServerURL":"ws://your-server:5003"}' | \
websocat ws://device-ip:5003
```

### 3. Hardware Configuration

```bash
# Configure LED and motor pins
echo '{"LEDPin":3,"motorPin":2}' | \
websocat ws://device-ip:5003
```

## Device Testing

### 1. Basic Functionality Test

```bash
# Test LED control
echo 'led:ff0000' | websocat ws://device-ip:5003

# Test vibration
echo 'vibrate:500' | websocat ws://device-ip:5003

# Test status
echo 'status' | websocat ws://device-ip:5003
```

### 2. Sensor Data Test

```bash
# Monitor sensor data
websocat ws://device-ip:5003

# Expected output:
# 1234a1b2c3d4e5f678901234567890
# 1234a2b3c4d5e6f789012345678901
```

### 3. BLE Beacon Test

```bash
# Test BLE scanning
echo 'ble:scan' | websocat ws://device-ip:5003

# Check beacon RSSI values in sensor data
```

## Troubleshooting

### Common Issues

#### 1. Upload Failures

```bash
# Check device connection
pio device list

# Try different upload speed
pio run -e seeed_xiao_esp32c3 -t upload --upload-speed 115200

# Reset device before upload
# Hold BOOT button, press RESET, release RESET, release BOOT
```

#### 2. WiFi Connection Issues

```bash
# Check WiFi credentials
echo 'status' | websocat ws://device-ip:5003

# Reset WiFi configuration
echo '{"wifiSSID":"","wifiPassword":""}' | websocat ws://device-ip:5003
```

#### 3. WebSocket Connection Issues

```bash
# Check server URL
echo 'status' | websocat ws://device-ip:5003

# Test server connectivity
curl http://your-server:5003/health
```

#### 4. BLE Issues

```bash
# Check BLE status
echo 'status' | websocat ws://device-ip:5003

# Restart BLE process
echo 'ble:restart' | websocat ws://device-ip:5003
```

### Debug Commands

```bash
# Enable debug mode
echo 'debug:on' | websocat ws://device-ip:5003

# Get device information
echo 'info' | websocat ws://device-ip:5003

# Reset device
echo 'reset' | websocat ws://device-ip:5003
```

## Production Deployment

### 1. Batch Upload Script

```bash
#!/bin/bash
# upload-multiple.sh

DEVICES=("COM5" "COM6" "COM7" "COM8")

for device in "${DEVICES[@]}"; do
    echo "Uploading to $device..."
    pio run -e seeed_xiao_esp32c3 -t upload --upload-port $device
    if [ $? -eq 0 ]; then
        echo "Successfully uploaded to $device"
    else
        echo "Failed to upload to $device"
    fi
done
```

### 2. Configuration Script

```bash
#!/bin/bash
# configure-devices.sh

SERVER_URL="ws://your-server:5003"
WIFI_SSID="YourNetwork"
WIFI_PASSWORD="YourPassword"

DEVICES=("192.168.1.100" "192.168.1.101" "192.168.1.102")

for device in "${DEVICES[@]}"; do
    echo "Configuring $device..."
    echo "{\"wifiSSID\":\"$WIFI_SSID\",\"wifiPassword\":\"$WIFI_PASSWORD\",\"socketServerURL\":\"$SERVER_URL\"}" | \
    websocat ws://$device:5003
done
```

### 3. Health Check Script

```bash
#!/bin/bash
# health-check.sh

DEVICES=("192.168.1.100" "192.168.1.101" "192.168.1.102")

for device in "${DEVICES[@]}"; do
    echo "Checking $device..."
    if echo 'status' | websocat ws://$device:5003 > /dev/null 2>&1; then
        echo "$device: OK"
    else
        echo "$device: FAILED"
    fi
done
```

## Maintenance

### 1. Firmware Updates

```bash
# Pull latest firmware
git pull origin main

# Recompile and upload
pio run -e seeed_xiao_esp32c3 -t upload
```

### 2. Configuration Backup

```bash
# Backup device configuration
echo 'export' | websocat ws://device-ip:5003 > device-config.json
```

### 3. Factory Reset

```bash
# Reset device to factory defaults
echo 'factory-reset' | websocat ws://device-ip:5003
```

## Best Practices

### 1. Development

- Use version control for firmware changes
- Test on multiple devices before deployment
- Document configuration changes
- Use consistent naming conventions

### 2. Deployment

- Batch upload for multiple devices
- Verify each device after upload
- Test network connectivity
- Monitor device health

### 3. Maintenance

- Regular firmware updates
- Monitor device logs
- Backup configurations
- Plan for device replacement

## Support

### Useful Resources

- **PlatformIO Documentation**: https://docs.platformio.org/
- **ESP32-C3 Datasheet**: https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf
- **Arduino ESP32 Core**: https://github.com/espressif/arduino-esp32

### Debug Tools

- **Serial Monitor**: Built into PlatformIO
- **WebSocket Client**: websocat, wscat
- **Network Tools**: ping, telnet, curl
- **Logic Analyzer**: For hardware debugging
