#ifndef BLE_Process_H
#define BLE_Process_H

#include <BLEDevice.h>
#include <BLEScan.h>
#include "Process.h"
#include "Timer.h"
#include "config.h"

// Forward declaration for the global pointer
class BleProcess;
extern BleProcess* g_bleProcess;

// The callback function that is executed when the scan is complete.
void scanCompleteCallback(BLEScanResults results);

// struct BLEData {
//     int rssiNE,
//     int rssiNW,
//     int rssiSW,
//     int rssiSE  
// };

class BleProcess : public Process {
public:
    BleProcess()
        : Process(),
          scanTimer(SCAN_INTERVAL_MS),
          pBLEScan(nullptr)
    {
        g_bleProcess = this;
    }

    void setup() override {
        BLEDevice::init("");
        pBLEScan = BLEDevice::getScan();
        pBLEScan->setActiveScan(false);
        pBLEScan->setInterval(BLE_SCAN_INTERVAL);
        pBLEScan->setWindow(BLE_SCAN_WINDOW);
        scanTimer.reset();        
    }

    void update() override {
        if (scanTimer.checkAndReset()) {
            startScan();
        }
    }

    void onScanComplete(BLEScanResults results) {
        //Serial.printf("Scan complete! Found %d devices.\n", results.getCount());                
        // ScanCompleteEvent event(results);
        // eventProcess->publish(event);
        // TODO: Implement event publishing
    }

private:
    void startScan() {
        pBLEScan->start(SCAN_DURATION, scanCompleteCallback);
    }
    
    Timer scanTimer;
    BLEScan* pBLEScan;
};

// Define the callback function to pass to the BLE scanner
inline void scanCompleteCallback(BLEScanResults results) {
    if (g_bleProcess) {
        g_bleProcess->onScanComplete(results);
    }
}

#endif // BLE_Process_H 