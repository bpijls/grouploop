#ifndef PUBLISH_PROCESS_H
#define PUBLISH_PROCESS_H

#include "Arduino.h"
#include "Process.h"
#include "Timer.h"
#include "Configuration.h"
#include "processes/BLEProcess.h"
#include "processes/IMUProcess.h"
#include "processes/WiFiProcess.h"
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <map>

// Forward declarations
class BleProcess;
class IMUProcess;
class WiFiProcess;

// Structure for device data to be sent via WebSocket
struct DeviceData {
    String deviceId;
    uint32_t timestamp;
    struct {
        float x;
        float y;
        float z;
    } imu;
    struct {
        int ne;
        int nw;
        int se;
        int sw;
    } beacons;
    
    DeviceData() : timestamp(0), imu{0, 0, 0}, beacons{0, 0, 0, 0} {}
};

class PublishProcess : public Process {
public:
    PublishProcess() 
        : Process(), 
          processes(nullptr),
          bleProcess(nullptr),
          imuProcess(nullptr),
          wifiProcess(nullptr),
          publishTimer(1000), // Publish every 1 second
          connectionTimer(5000), // Check connection every 5 seconds
          reconnectTimer(10000), // Reconnect every 10 seconds if disconnected
          isConnected(false),
          reconnectAttempts(0),
          maxReconnectAttempts(5),
          lastPublishTime(0)
    {
        // Generate unique device ID based on MAC address
        deviceId = "Scanner_" + WiFi.macAddress();
        deviceId.replace(":", "");
    }

    void setProcesses(std::map<String, Process*>* processes) {
        this->processes = processes;
        
        // Get references to specific processes
        if (processes) {
            bleProcess = static_cast<BleProcess*>(processes->at("ble"));
            imuProcess = static_cast<IMUProcess*>(processes->at("imu"));
            wifiProcess = static_cast<WiFiProcess*>(processes->at("wifi"));
        }
    }

    void setup() override {
        Serial.println("PublishProcess: Initializing WebSocket client...");
        
        // Configure WebSocket client
        String serverURL = configuration.getSocketServerURL();
        if (serverURL.length() > 0) {
            // Parse URL to extract host and port
            parseServerURL(serverURL);
            
            // Set up WebSocket event handlers
            webSocket.onEvent([this](WStype_t type, uint8_t * payload, size_t length) {
                this->webSocketEvent(type, payload, length);
            });
            
            // Start connection attempt
            attemptConnection();
        } else {
            Serial.println("PublishProcess: No WebSocket server URL configured");
        }
    }

    void update() override {
        // Check WiFi connection first
        if (!wifiProcess || !wifiProcess->isWiFiConnected()) {
            return; // Don't attempt WebSocket connection without WiFi
        }
        
        // Check WebSocket connection status
        if (connectionTimer.checkAndReset()) {
            checkConnection();
        }
        
        // Attempt reconnection if needed
        if (!isConnected && reconnectTimer.checkAndReset()) {
            if (reconnectAttempts < maxReconnectAttempts) {
                attemptConnection();
            }
        }
        
        // Publish data periodically
        if (isConnected && publishTimer.checkAndReset()) {
            publishDeviceData();
        }
        
        // Handle WebSocket events
        webSocket.loop();
    }    

    String getState() override { 
        if (isConnected) {
            return String("CONNECTED");
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            return String("FAILED");
        } else {
            return String("CONNECTING (") + String(reconnectAttempts) + "/" + String(maxReconnectAttempts) + ")";
        }
    }
    
    // Public methods for external control
    void forceReconnect() {
        Serial.println("PublishProcess: Forcing WebSocket reconnection...");
        isConnected = false;
        reconnectAttempts = 0;
        webSocket.disconnect();
        reconnectTimer.reset();
    }
    
    String getDeviceId() const {
        return deviceId;
    }
    
    bool isWebSocketConnected() const {
        return isConnected;
    }

private:
    void parseServerURL(const String& url) {
        // Parse WebSocket URL (e.g., "ws://feib.nl:5003")
        if (url.startsWith("ws://")) {
            String hostPort = url.substring(5); // Remove "ws://"
            int colonIndex = hostPort.indexOf(':');
            
            if (colonIndex > 0) {
                serverHost = hostPort.substring(0, colonIndex);
                serverPort = hostPort.substring(colonIndex + 1).toInt();
            } else {
                serverHost = hostPort;
                serverPort = 80; // Default WebSocket port
            }
            
            Serial.print("PublishProcess: Parsed server - Host: ");
            Serial.print(serverHost);
            Serial.print(", Port: ");
            Serial.println(serverPort);
        } else {
            Serial.println("PublishProcess: Invalid WebSocket URL format");
        }
    }
    
    void attemptConnection() {
        if (serverHost.length() == 0) {
            Serial.println("PublishProcess: No server host configured");
            return;
        }
        
        Serial.print("PublishProcess: Attempting WebSocket connection to ");
        Serial.print(serverHost);
        Serial.print(":");
        Serial.print(serverPort);
        Serial.print(" (attempt ");
        Serial.print(reconnectAttempts + 1);
        Serial.print("/");
        Serial.print(maxReconnectAttempts);
        Serial.println(")...");
        
        // Attempt connection
        webSocket.begin(serverHost.c_str(), serverPort, "/");
        webSocket.setReconnectInterval(5000);
        
        reconnectAttempts++;
    }
    
    void checkConnection() {
        bool wasConnected = isConnected;
        isConnected = webSocket.isConnected();
        
        if (isConnected && !wasConnected) {
            Serial.println("PublishProcess: WebSocket connected successfully!");
            reconnectAttempts = 0;
            
            // Send device identification
            sendDeviceIdentification();
        } else if (!isConnected && wasConnected) {
            Serial.println("PublishProcess: WebSocket connection lost!");
            reconnectTimer.reset();
        }
    }
    
    void sendDeviceIdentification() {
        JsonDocument doc;
        doc["type"] = "device_identification";
        doc["deviceId"] = deviceId;
        doc["deviceType"] = "scanner";
        
        // Create capabilities array
        JsonArray capabilities = doc["capabilities"].to<JsonArray>();
        capabilities.add("imu");
        capabilities.add("ble_scanning");
        capabilities.add("led_control");
        capabilities.add("vibration_control");
        
        String message;
        serializeJson(doc, message);
        
        Serial.print("PublishProcess: Sending device identification: ");
        Serial.println(message);
        
        webSocket.sendTXT(message);
    }
    
    void publishDeviceData() {
        if (!bleProcess || !imuProcess) {
            return;
        }
        
        // Collect current device data
        DeviceData data;
        data.deviceId = deviceId;
        data.timestamp = millis();
        
        // Get IMU data
        IMUData imuData = imuProcess->getIMUData();
        data.imu.x = imuData.x_g;
        data.imu.y = imuData.y_g;
        data.imu.z = imuData.z_g;
        
        // Get beacon RSSI data
        data.beacons.ne = bleProcess->getBeaconRSSI("NE");
        data.beacons.nw = bleProcess->getBeaconRSSI("NW");
        data.beacons.se = bleProcess->getBeaconRSSI("SE");
        data.beacons.sw = bleProcess->getBeaconRSSI("SW");
        
        // Create JSON message
        JsonDocument doc;
        doc["type"] = "device_data";
        doc["deviceId"] = data.deviceId;
        doc["timestamp"] = data.timestamp;
        
        // Add IMU data
        JsonObject imu = doc["imu"].to<JsonObject>();
        imu["x"] = data.imu.x;
        imu["y"] = data.imu.y;
        imu["z"] = data.imu.z;
        
        // Add beacon data
        JsonObject beacons = doc["beacons"].to<JsonObject>();
        beacons["ne"] = data.beacons.ne;
        beacons["nw"] = data.beacons.nw;
        beacons["se"] = data.beacons.se;
        beacons["sw"] = data.beacons.sw;
        
        // Serialize and send
        String message;
        serializeJson(doc, message);
        
        webSocket.sendTXT(message);
        
        lastPublishTime = millis();
    }
    
    void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
        switch(type) {
            case WStype_DISCONNECTED:
                Serial.println("PublishProcess: WebSocket disconnected");
                isConnected = false;
                break;
                
            case WStype_CONNECTED:
                Serial.print("PublishProcess: WebSocket connected to: ");
                Serial.println((char*)payload);
                isConnected = true;
                reconnectAttempts = 0;
                break;
                
            case WStype_TEXT:
                handleIncomingMessage((char*)payload, length);
                break;
                
            case WStype_ERROR:
                Serial.print("PublishProcess: WebSocket error: ");
                Serial.println((char*)payload);
                break;
                
            default:
                break;
        }
    }
    
    void handleIncomingMessage(const char* message, size_t length) {
        Serial.print("PublishProcess: Received message: ");
        Serial.println(message);
        
        // Parse incoming JSON message
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, message);
        
        if (error) {
            Serial.print("PublishProcess: JSON parsing failed: ");
            Serial.println(error.c_str());
            return;
        }
        
        // Handle different message types
        String messageType = doc["type"].as<String>();
        
        if (messageType == "ping") {
            // Respond to ping
            JsonDocument response;
            response["type"] = "pong";
            response["deviceId"] = deviceId;
            response["timestamp"] = millis();
            
            String responseMessage;
            serializeJson(response, responseMessage);
            webSocket.sendTXT(responseMessage);
            
        } else if (messageType == "command") {
            // Handle device commands (LED, vibration, etc.)
            handleDeviceCommand(doc);
        }
    }
    
    void handleDeviceCommand(const JsonDocument& command) {
        String commandType = command["commandType"].as<String>();
        
        Serial.print("PublishProcess: Handling command: ");
        Serial.println(commandType);
        
        // Forward command to appropriate process
        if (processes) {
            if (commandType == "led" && processes->find("led") != processes->end()) {
                // Handle LED command
                Serial.println("PublishProcess: LED command received");
                handleLEDCommand(command);
            } else if (commandType == "vibration" && processes->find("vibration") != processes->end()) {
                // Handle vibration command
                Serial.println("PublishProcess: Vibration command received");
                handleVibrationCommand(command);
            } else {
                Serial.print("PublishProcess: Unknown command type: ");
                Serial.println(commandType);
            }
        }
    }
    
    void handleLEDCommand(const JsonDocument& command) {
        // TODO: Implement LED command handling
        // Example: command["commandData"] might contain {"behavior": "pulse", "color": "#FF0000", "duration": 5000}
        Serial.println("PublishProcess: LED command processing not yet implemented");
        
        // Access command data like this:
        // String behavior = command["commandData"]["behavior"].as<String>();
        // String color = command["commandData"]["color"].as<String>();
        // int duration = command["commandData"]["duration"].as<int>();
    }
    
    void handleVibrationCommand(const JsonDocument& command) {
        // TODO: Implement vibration command handling
        // Example: command["commandData"] might contain {"pattern": "pulse", "intensity": 0.8, "duration": 3000}
        Serial.println("PublishProcess: Vibration command processing not yet implemented");
        
        // Access command data like this:
        // String pattern = command["commandData"]["pattern"].as<String>();
        // float intensity = command["commandData"]["intensity"].as<float>();
        // int duration = command["commandData"]["duration"].as<int>();
    }
    
    // Member variables
    std::map<String, Process*>* processes;
    BleProcess* bleProcess;
    IMUProcess* imuProcess;
    WiFiProcess* wifiProcess;
    
    WebSocketsClient webSocket;
    String deviceId;
    String serverHost;
    int serverPort;
    
    Timer publishTimer;
    Timer connectionTimer;
    Timer reconnectTimer;
    
    bool isConnected;
    int reconnectAttempts;
    int maxReconnectAttempts;
    uint32_t lastPublishTime;
};

#endif // PUBLISH_PROCESS_H