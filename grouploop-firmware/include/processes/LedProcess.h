#ifndef LED_PROCESS_H
#define LED_PROCESS_H

#include <Adafruit_NeoPixel.h>
#include <Ticker.h>
#include "Process.h"
#include "config.h"
#include "LedBehaviors.h"
#include "Configuration.h"

class LedProcess : public Process {
public:
    LedProcess() : Process(), pixels(LED_COUNT, configuration.getLEDPin(), NEO_GRB + NEO_KHZ800), currentBehavior(nullptr) {
    }

    ~LedProcess() {
        ledTicker.detach();
    }

    void setBehavior(LedBehavior* newBehavior) {
        currentBehavior = newBehavior;
        if (currentBehavior) {
            currentBehavior->setup(pixels);
        }
    }

    void setup() override {        
        pixels.begin();
        pixels.setBrightness(127); // Don't set too high to avoid high current draw
        // Use a lambda to call the member function, passing 'this'
        ledTicker.attach_ms(20, +[](LedProcess* instance) { instance->update(); }, this);
    }

    void update() override {
        if (currentBehavior) {
            currentBehavior->update();
        }

    }

    // Public members for access by BleManager
    Adafruit_NeoPixel pixels;
    LedBehavior* currentBehavior;

private:
    Ticker ledTicker;
};

#endif // LED_PROCESS_H 