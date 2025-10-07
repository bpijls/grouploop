/* 
Deze code moet:
BLE ontvangen van de beacons.                             |Check
De RSSI en de naam van de beacon naar de server sturen.   |Check
Data ontvangen van de server.                             |
Commands van de server uitvoeren.                         |
*/
#include "Arduino.h"
#include <vector>
#include "config.h"
#include "Timer.h"

// Process classes
#include "processes/IMUProcess.h"
#include "processes/LedProcess.h"
#include "processes/VibrationProcess.h"
#include "processes/BleProcess.h"
#include "Process.h"


// Global pointer for BLE callback
BleProcess* g_bleProcess = nullptr;

// Instantiate managers

LedProcess LedProcess;
VibrationProcess vibrationProcess;
IMUProcess imuProcess;
BleProcess bleProcess;
PublishProcess publishProcess;

Process* processes[] = {      
    &LedProcess,
    &vibrationProcess,
    &imuProcess,
    &bleProcess,
    &publishProcess
};

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  LedProcess.setBehavior(new HeartBeatBehavior(0xFF0000, 770, 2000));

  // Initialize all processes and pass them the event manager
  for (auto process : processes) {
    process->setup();
  }
}

void loop() {
  // Update all processes
  for (auto process : processes) {
    process->update();
  }
}
