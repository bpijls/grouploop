/* 
Deze code moet:
BLE ontvangen van de beacons.                             |Check
De RSSI en de naam van de beacon naar de server sturen.   |Check
Data ontvangen van de server.                             |
Commands van de server uitvoeren.                         |
*/
#include "Arduino.h"
#include <map>
#include "config.h"
#include "Timer.h"
#include "Configuration.h"

// Process classes
#include "processes/IMUProcess.h"
#include "processes/LedProcess.h"
#include "processes/VibrationProcess.h"
#include "processes/BleProcess.h"
#include "processes/PublishProcess.h"
#include "processes/ConfigurationProcess.h"
#include "processes/WiFiProcess.h"
#include "Process.h"


// Global pointer for BLE callback
BleProcess* g_bleProcess = nullptr;

// Global Configuration instance
Configuration configuration;

// Global process pointers - initialized in setup()
LedProcess* ledProcess = nullptr;
VibrationProcess* vibrationProcess = nullptr;
IMUProcess* imuProcess = nullptr;
BleProcess* bleProcess = nullptr;
PublishProcess* publishProcess = nullptr;
ConfigurationProcess* configurationProcess = nullptr;
WiFiProcess* wifiProcess = nullptr;


std::map<String, Process*> processes;

void setup() {
  delay(SETUP_DELAY);
  Serial.println("Starting setup");
  Serial.begin(SERIAL_BAUD_RATE);

  // Initialize configuration with default values
  configuration.initialize();
  Serial.println("Configuration initialized");
  
  // Print beacon configuration
  Serial.println("=== Beacon Configuration ===");
  Serial.print("NE Beacon: ");
  Serial.println(configuration.getBeaconNE());
  Serial.print("NW Beacon: ");
  Serial.println(configuration.getBeaconNW());
  Serial.print("SE Beacon: ");
  Serial.println(configuration.getBeaconSE());
  Serial.print("SW Beacon: ");
  Serial.println(configuration.getBeaconSW());
  Serial.println("============================");

  // Initialize process instances
  wifiProcess = new WiFiProcess();
  ledProcess = new LedProcess();
  vibrationProcess = new VibrationProcess();
  imuProcess = new IMUProcess();
  bleProcess = new BleProcess();
  publishProcess = new PublishProcess();
  configurationProcess = new ConfigurationProcess();

  // Set up the processes map
  processes = {
    {"wifi", wifiProcess},
    {"led", ledProcess},
    {"vibration", vibrationProcess},
    {"imu", imuProcess},
    {"ble", bleProcess},
    {"publish", publishProcess},
    {"configuration", configurationProcess}
  };

  // Set up LED behavior
  ledProcess->setBehavior(new HeartBeatBehavior(0xFF0000, 770, 2000));

  // Initialize all processes
  for (auto &entry : processes) {
    entry.second->setup();
  }
  
  // Set up PublishProcess with process references
  publishProcess->setProcesses(&processes);
}

void loop() {
  // Update all processes
  for (auto &entry : processes) {
    entry.second->update();
  }
  
  // Example: Access beacon data (this would typically be done in PublishProcess)
  static uint32_t lastBeaconLog = 0;
  if (millis() - lastBeaconLog > 5000) { // Log every 5 seconds
    lastBeaconLog = millis();
    
    // Log system status
    Serial.println("=== System Status ===");
    Serial.print("WiFi: ");
    Serial.println(wifiProcess->getState());
    if (wifiProcess->isWiFiConnected()) {
      Serial.print("IP: ");
      Serial.print(wifiProcess->getIPAddress());
      Serial.print(", Signal: ");
      Serial.print(wifiProcess->getRSSI());
      Serial.println(" dBm");
    }
    Serial.print("WebSocket: ");
    Serial.println(publishProcess->getState());
    Serial.print("Device ID: ");
    Serial.println(publishProcess->getDeviceId());
    
    // Get latest scan results
    const BLEScanResult& scanResult = bleProcess->getLatestScanResult();
    
    if (scanResult.beacons.size() > 0) {
      Serial.println("=== Current Beacon Status ===");
      Serial.print("NE: ");
      Serial.print(bleProcess->getBeaconRSSI("NE"));
      Serial.print(" dBm, NW: ");
      Serial.print(bleProcess->getBeaconRSSI("NW"));
      Serial.print(" dBm, SE: ");
      Serial.print(bleProcess->getBeaconRSSI("SE"));
      Serial.print(" dBm, SW: ");
      Serial.println(bleProcess->getBeaconRSSI("SW"));
    }
    Serial.println("=====================");
  }
}
