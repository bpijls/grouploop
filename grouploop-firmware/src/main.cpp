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

// Process classes
#include "processes/IMUProcess.h"
#include "processes/LedProcess.h"
#include "processes/VibrationProcess.h"
#include "processes/BleProcess.h"
#include "processes/PublishProcess.h"
#include "Process.h"


// Global pointer for BLE callback
BleProcess* g_bleProcess = nullptr;

// Instantiate managers

LedProcess LedProcess;
VibrationProcess vibrationProcess;
IMUProcess imuProcess;
BleProcess bleProcess;
PublishProcess publishProcess;

std::map<String, Process*> processes = {
	{"led", &LedProcess},
	{"vibration", &vibrationProcess},
	{"imu", &imuProcess},
	{"ble", &bleProcess},
	{"publish", &publishProcess}
};

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  LedProcess.setBehavior(new HeartBeatBehavior(0xFF0000, 770, 2000));

  // Initialize all processes
  for (auto &entry : processes) {
    entry.second->setup();
  }
}

void loop() {
  // Update all processes
  for (auto &entry : processes) {
    entry.second->update();
  }
}
