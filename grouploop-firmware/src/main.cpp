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
#include "processes/BLEProcess.h"
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
  // Always update configuration process first
  if (configurationProcess) {
    configurationProcess->update();
  }
  
  // If in configuration mode, halt other processes until exit or timeout
  if (configurationProcess && configurationProcess->isInConfigurationMode()) {
    return;
  }
  
  // Otherwise update all other processes
  for (auto &entry : processes) {
    if (entry.first != "configuration") {
      entry.second->update();
    }
  }
  
}
