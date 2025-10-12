#ifndef LED_PROCESS_H
#define LED_PROCESS_H

#include <Adafruit_NeoPixel.h>
#include <Ticker.h>
#include "Process.h"
#include "config.h"
#include "LedBehaviors.h"
#include "Configuration.h"
#include "CommandRegistry.h"

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
        pixels.setBrightness(255); // Don't set too high to avoid high current draw
        // Use a lambda to call the member function, passing 'this'
        ledTicker.attach_ms(20, +[](LedProcess* instance) { instance->update(); }, this);
        
        // Register LED commands
        registerCommands();
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
    
    void registerCommands() {
        // Register LED command
        commandRegistry.registerCommand("led", [this](const String& params) {
            if (params.length() == 0) return;
            
            // Check for predefined behavior names first
            if (params == "red") {
                setBehavior(&ledsRed);
                Serial.println("Set LED to red");
            }
            else if (params == "green") {
                setBehavior(&ledsGreen);
                Serial.println("Set LED to green");
            }
            else if (params == "blue") {
                setBehavior(&ledsBlue);
                Serial.println("Set LED to blue");
            }
            else if (params == "white") {
                setBehavior(&ledsWhite);
                Serial.println("Set LED to white");
            }
            else if (params == "yellow") {
                setBehavior(&ledsYellow);
                Serial.println("Set LED to yellow");
            }
            else if (params == "cyan") {
                setBehavior(&ledsCyan);
                Serial.println("Set LED to cyan");
            }
            else if (params == "magenta") {
                setBehavior(&ledsMagenta);
                Serial.println("Set LED to magenta");
            }
            else if (params == "breathing") {
                setBehavior(&ledsBreathing);
                Serial.println("Set LED to breathing");
            }
            else if (params == "heartbeat") {
                setBehavior(&ledsHeartBeat);
                Serial.println("Set LED to heartbeat");
            }
            else if (params == "cycle") {
                setBehavior(&ledsCycle);
                Serial.println("Set LED to cycle");
            }
            else if (params == "off") {
                setBehavior(&ledsOff);
                Serial.println("Set LED to off");
            }
            else {
                // Try to parse as hex color
                unsigned long color = strtoul(params.c_str(), NULL, 16);
                ledsSolid.color = color;
                setBehavior(&ledsSolid);
                Serial.print("Set LED color to: ");
                Serial.println(params);
            }
        });
        
        // Register pattern command
        commandRegistry.registerCommand("pattern", [this](const String& params) {
            if (params == "breathing") {
                setBehavior(&ledsBreathing);
                Serial.println("Set LED pattern to breathing");
            }
            else if (params == "heartbeat") {
                setBehavior(&ledsHeartBeat);
                Serial.println("Set LED pattern to heartbeat");
            }
            else if (params == "cycle") {
                setBehavior(&ledsCycle);
                Serial.println("Set LED pattern to cycle");
            }
            else if (params == "off") {
                setBehavior(&ledsOff);
                Serial.println("Set LED pattern to off");
            }
            else {
                Serial.print("Unknown pattern: ");
                Serial.println(params);
            }
        });
        
        // Register brightness command
        commandRegistry.registerCommand("brightness", [this](const String& params) {
            int brightness = params.toInt();
            if (brightness >= 0 && brightness <= 255) {
                pixels.setBrightness(brightness);
                Serial.print("Set LED brightness to: ");
                Serial.println(brightness);
            } else {
                Serial.println("Brightness must be between 0 and 255");
            }
        });
    }
};

#endif // LED_PROCESS_H 