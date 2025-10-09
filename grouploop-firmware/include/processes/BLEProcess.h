#ifndef BLE_Process_H
#define BLE_Process_H

#include <BLEDevice.h>
#include <BLEScan.h>
#include "Process.h"
#include "Timer.h"
#include "config.h"
#include "Configuration.h"
#include <map>
#include <vector>

// Forward declaration for the global pointer
class BleProcess;
extern BleProcess* g_bleProcess;

// The callback function that is executed when the scan is complete.
void scanCompleteCallback(BLEScanResults results);

// Structure to hold beacon data
struct BeaconData {
    String beaconId;
    int rssi;
    String address;
    uint32_t timestamp;
    
    BeaconData() : rssi(0), timestamp(0) {}
    BeaconData(const String& id, int r, const String& addr, uint32_t ts) 
        : beaconId(id), rssi(r), address(addr), timestamp(ts) {}
};

// Structure to hold complete BLE scan results
struct BLEScanResult {
    std::map<String, BeaconData> beacons;  // Key: beacon identifier, Value: beacon data
    uint32_t scanTimestamp;
    
    BLEScanResult() : scanTimestamp(0) {}
};

class BleProcess : public Process {
public:
    BleProcess()
        : Process(),
          scanTimer(SCAN_INTERVAL_MS),
          pBLEScan(nullptr),
          isScanning(false),
          lastScanStartMs(0)
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
        if (isScanning) {
            const uint32_t expectedDurationMs = (uint32_t)SCAN_DURATION * 1000UL;
            const uint32_t watchdogMarginMs = 1500UL;
            if (millis() - lastScanStartMs > expectedDurationMs + watchdogMarginMs) {
                pBLEScan->stop();
                pBLEScan->clearResults();
                isScanning = false;
                scanTimer.reset();
            }
            return;
        }
        if (scanTimer.checkAndReset()) {
            startScan();
        }
    }

    String getState() override { return isScanning ? String("SCANNING") : String("IDLE"); }

    void onScanComplete(BLEScanResults results) {      
        processScanResults(results);
        pBLEScan->clearResults();
        isScanning = false;
        scanTimer.reset();
    }
    
    // Get the latest scan results
    const BLEScanResult& getLatestScanResult() const { return latestScanResult; }
    
    // Check if a specific beacon was detected in the latest scan
    bool isBeaconDetected(const String& beaconId) const {
        return latestScanResult.beacons.find(beaconId) != latestScanResult.beacons.end();
    }
    
    // Get RSSI for a specific beacon (returns 0 if not detected)
    int getBeaconRSSI(const String& beaconId) const {
        auto it = latestScanResult.beacons.find(beaconId);
        return (it != latestScanResult.beacons.end()) ? it->second.rssi : 0;
    }

private:
    void startScan() {
        isScanning = true;
        lastScanStartMs = millis();
        pBLEScan->start(SCAN_DURATION, scanCompleteCallback);
    }
    
    void processScanResults(BLEScanResults results) {
        latestScanResult.beacons.clear();
        latestScanResult.scanTimestamp = millis();
        
        // Get configured beacon identifiers
        String beaconNE = configuration.getBeaconNE();
        String beaconNW = configuration.getBeaconNW();
        String beaconSE = configuration.getBeaconSE();
        String beaconSW = configuration.getBeaconSW();
        
        // Process each discovered device
        for (int i = 0; i < results.getCount(); i++) {
            BLEAdvertisedDevice device = results.getDevice(i);
            String deviceName = device.getName().c_str();
            String deviceAddress = device.getAddress().toString().c_str();
            int rssi = device.getRSSI();
            
            // Check if this device matches any of our configured beacons
            String beaconId = "";
            if (deviceName == beaconNE) {
                beaconId = "NE";
            } else if (deviceName == beaconNW) {
                beaconId = "NW";
            } else if (deviceName == beaconSE) {
                beaconId = "SE";
            } else if (deviceName == beaconSW) {
                beaconId = "SW";
            }
            
            // If we found a matching beacon, store its data
            if (beaconId.length() > 0) {
                latestScanResult.beacons[beaconId] = BeaconData(beaconId, rssi, deviceAddress, latestScanResult.scanTimestamp);
                Serial.print("Found beacon ");
                Serial.print(beaconId);
                Serial.print(" (");
                Serial.print(deviceName);
                Serial.print(") RSSI: ");
                Serial.println(rssi);
            }
        }
        
        // Log summary of detected beacons
        Serial.print("Scan complete. Detected ");
        Serial.print(latestScanResult.beacons.size());
        Serial.println(" beacons.");
    }
    
    Timer scanTimer;
    BLEScan* pBLEScan;
    bool isScanning;
    uint32_t lastScanStartMs;
    BLEScanResult latestScanResult;
    
};

// Define the callback function to pass to the BLE scanner
inline void scanCompleteCallback(BLEScanResults results) {
    if (g_bleProcess) {
        g_bleProcess->onScanComplete(results);
    }
}

#endif // BLE_Process_H 