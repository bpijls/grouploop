#ifndef IMU_PROCESS_H
#define IMU_PROCESS_H

#include "Process.h"
#include "Timer.h"
#include "SparkFun_LIS2DH12.h"
#include <Wire.h>
#include <math.h>

// Conversion factor from cm/s^2 to g. 1g = 980.665 cm/s^2
#define CMS2_TO_G 0.0010197

struct IMUData {
    float x_g;
    float y_g;
    float z_g;
};

class IMUProcess : public Process {
private:
    Timer readTimer;
    SPARKFUN_LIS2DH12 sensor;       //Create instance
    bool sensorOk = false;

    IMUData data;
    
public:
    IMUProcess() : 
        readTimer(10) // Read every 10ms
    {}

    void setup() override {        
        // The LIS2DH12 library uses Wire, so it should be initialized.
        // It's often safe to call Wire.begin() multiple times.
        Wire.begin(); 
        
        // The begin function returns a status, 0 on success
        if (sensor.begin() != 0) {
            Serial.println("IMU sensor initialized successfully.");
            sensorOk = true;
            sensor.setMode(LIS2DH12_NM_10bit);
            sensor.setDataRate(LIS2DH12_ODR_100Hz);
            sensor.setScale(LIS2DH12_4g);
        } else {            
            Serial.println("Could not initialize IMU sensor.");
        }
    
    }

    void update() override {
        if (sensorOk && readTimer.checkAndReset() && sensor.available()) {
            // --- 1. Read and Convert Data ---            
            data.x_g = sensor.getX() * CMS2_TO_G;
            data.y_g = sensor.getY() * CMS2_TO_G;
            data.z_g = sensor.getZ() * CMS2_TO_G;            
        }
    }

    IMUData getIMUData() const {
        return data;
    }
 
};

#endif // IMU_PROCESS_H 