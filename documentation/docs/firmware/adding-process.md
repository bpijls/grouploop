# Adding a New Process to GroupLoop Firmware

This guide provides step-by-step instructions for adding a new process to the GroupLoop firmware architecture.

## Overview

Adding a new process involves:
1. Creating the process class
2. Implementing required methods
3. Registering with ProcessManager
4. Adding command handlers (if needed)
5. Updating main.cpp

## Step 1: Create Process Header File

Create a new header file in `include/processes/`:

```cpp
// include/processes/MyNewProcess.h
#ifndef MY_NEW_PROCESS_H
#define MY_NEW_PROCESS_H

#include "Process.h"
#include "config.h"
#include "CommandRegistry.h"

class MyNewProcess : public Process {
public:
    MyNewProcess() : Process() {
        // Initialize member variables
    }

    ~MyNewProcess() {
        // Cleanup resources
    }

    void setup() override {
        // Initialize hardware and resources
        registerCommands();
    }

    void update() override {
        // Main process logic - called continuously
        if (!isProcessRunning()) return;
        
        // Your process logic here
    }

    String getState() override {
        // Return process state information
        return "Running";
    }

private:
    // Private member variables
    bool initialized = false;
    
    void registerCommands() {
        // Register command handlers
        commandRegistry.registerCommand("mycommand", [this](const String& params) {
            handleMyCommand(params);
        });
    }
    
    void handleMyCommand(const String& params) {
        // Command implementation
        Serial.print("MyNewProcess received command: ");
        Serial.println(params);
    }
};

#endif // MY_NEW_PROCESS_H
```

## Step 2: Implement Process Logic

### Basic Process Structure

```cpp
class MyNewProcess : public Process {
private:
    // Hardware pins and configuration
    int myPin = 4;
    bool myState = false;
    
    // Timing and control
    unsigned long lastUpdate = 0;
    const unsigned long updateInterval = 100; // 100ms
    
public:
    void setup() override {
        // Initialize hardware
        pinMode(myPin, OUTPUT);
        digitalWrite(myPin, LOW);
        
        // Register commands
        registerCommands();
        
        Serial.println("MyNewProcess initialized");
    }
    
    void update() override {
        if (!isProcessRunning()) return;
        
        // Check if it's time to update
        unsigned long now = millis();
        if (now - lastUpdate >= updateInterval) {
            lastUpdate = now;
            
            // Your periodic logic here
            performUpdate();
        }
    }
    
private:
    void performUpdate() {
        // Toggle state as example
        myState = !myState;
        digitalWrite(myPin, myState ? HIGH : LOW);
    }
};
```

### Advanced Process with Hardware Library

```cpp
#include "SomeHardwareLibrary.h"

class MyNewProcess : public Process {
private:
    SomeHardwareLibrary hardware;
    bool hardwareInitialized = false;
    
public:
    void setup() override {
        // Initialize hardware library
        if (hardware.begin()) {
            hardwareInitialized = true;
            Serial.println("Hardware initialized successfully");
        } else {
            Serial.println("Hardware initialization failed");
        }
        
        registerCommands();
    }
    
    void update() override {
        if (!isProcessRunning() || !hardwareInitialized) return;
        
        // Read from hardware
        int value = hardware.read();
        
        // Process data
        processData(value);
    }
    
private:
    void processData(int value) {
        // Your data processing logic
        if (value > threshold) {
            triggerAction();
        }
    }
    
    void triggerAction() {
        // Perform action
        hardware.write(1);
    }
};
```

## Step 3: Register Commands

### Simple Command Registration

```cpp
void registerCommands() {
    // Basic command with parameter
    commandRegistry.registerCommand("myset", [this](const String& params) {
        int value = params.toInt();
        if (value >= 0 && value <= 255) {
            setValue(value);
            Serial.print("Set value to: ");
            Serial.println(value);
        } else {
            Serial.println("Invalid value range");
        }
    });
    
    // Command without parameters
    commandRegistry.registerCommand("myreset", [this](const String& params) {
        reset();
        Serial.println("Reset performed");
    });
    
    // Command with string parameter
    commandRegistry.registerCommand("mymode", [this](const String& params) {
        if (params == "on") {
            setMode(true);
        } else if (params == "off") {
            setMode(false);
        } else {
            Serial.println("Invalid mode: use 'on' or 'off'");
        }
    });
}
```

### Advanced Command Registration

```cpp
void registerCommands() {
    // Command with validation
    commandRegistry.registerCommand("myconfig", [this](const String& params) {
        if (params.length() == 0) {
            Serial.println("Usage: myconfig:<setting>:<value>");
            return;
        }
        
        int colonIndex = params.indexOf(':');
        if (colonIndex == -1) {
            Serial.println("Invalid format: use setting:value");
            return;
        }
        
        String setting = params.substring(0, colonIndex);
        String value = params.substring(colonIndex + 1);
        
        if (setting == "pin") {
            int pin = value.toInt();
            if (pin >= 0 && pin <= 40) {
                setPin(pin);
                Serial.print("Pin set to: ");
                Serial.println(pin);
            } else {
                Serial.println("Invalid pin number");
            }
        } else if (setting == "rate") {
            int rate = value.toInt();
            if (rate >= 1 && rate <= 1000) {
                setUpdateRate(rate);
                Serial.print("Update rate set to: ");
                Serial.println(rate);
            } else {
                Serial.println("Invalid rate: 1-1000 Hz");
            }
        } else {
            Serial.print("Unknown setting: ");
            Serial.println(setting);
        }
    });
}
```

## Step 4: Update main.cpp

### Add Process Include

```cpp
// Add to includes section
#include "processes/MyNewProcess.h"
```

### Register Process with ProcessManager

```cpp
void setup() {
    // ... existing setup code ...
    
    // Add your new process
    processManager.addProcess("mynew", new MyNewProcess());
    
    // ... rest of setup ...
}
```

### Handle Process Dependencies

```cpp
void loop() {
    // ... existing loop code ...
    
    // Example: Start your process after WiFi connects
    WiFiProcess* wifiProcess = static_cast<WiFiProcess*>(processManager.getProcess("wifi"));
    MyNewProcess* myProcess = static_cast<MyNewProcess*>(processManager.getProcess("mynew"));
    
    if (wifiProcess && myProcess) {
        if (wifiProcess->isWiFiConnected() && !myProcess->isProcessRunning()) {
            processManager.startProcess("mynew");
            Serial.println("WiFi connected - starting MyNewProcess");
        } else if (!wifiProcess->isWiFiConnected() && myProcess->isProcessRunning()) {
            processManager.haltProcess("mynew");
            Serial.println("WiFi disconnected - halting MyNewProcess");
        }
    }
    
    // ... rest of loop ...
}
```

## Step 5: Update Command Registry (Optional)

If your process adds new commands, update the CDN command registry:

```json
// cdn-server/app/static/commands.json
{
  "commands": {
    // ... existing commands ...
    "myset": {
      "handler": "myset",
      "parameters": ["value"],
      "description": "Set process value (0-255)",
      "examples": ["myset:128", "myset:255"]
    },
    "myreset": {
      "handler": "myreset",
      "parameters": [],
      "description": "Reset process to default state",
      "examples": ["myreset"]
    },
    "mymode": {
      "handler": "mymode",
      "parameters": ["mode"],
      "description": "Set process mode (on/off)",
      "examples": ["mymode:on", "mymode:off"]
    }
  }
}
```

## Step 6: Testing Your Process

### Serial Monitor Testing

```cpp
// Add to your process for debugging
void MyNewProcess::update() override {
    if (!isProcessRunning()) return;
    
    // Add debug output
    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 5000) { // Every 5 seconds
        lastDebug = millis();
        Serial.print("MyNewProcess status: ");
        Serial.println(getState());
    }
    
    // Your process logic
}
```

### Command Testing

Test your commands via serial monitor or WebSocket:
```
myset:128
myreset
mymode:on
status
```

## Best Practices

### 1. Error Handling

```cpp
void setup() override {
    try {
        // Initialize hardware
        if (!initializeHardware()) {
            Serial.println("Hardware initialization failed");
            return;
        }
        
        registerCommands();
        Serial.println("MyNewProcess setup complete");
    } catch (...) {
        Serial.println("Exception in MyNewProcess setup");
    }
}
```

### 2. Resource Management

```cpp
~MyNewProcess() {
    // Clean up resources
    if (hardwareInitialized) {
        hardware.end();
    }
    
    // Detach any timers or interrupts
    // Free any allocated memory
}
```

### 3. State Management

```cpp
String getState() override {
    String state = "Running";
    if (!hardwareInitialized) {
        state = "Hardware Error";
    } else if (!isProcessRunning()) {
        state = "Halted";
    }
    return state;
}
```

### 4. Performance Considerations

```cpp
void update() override {
    if (!isProcessRunning()) return;
    
    // Use timing to control update frequency
    static unsigned long lastUpdate = 0;
    const unsigned long updateInterval = 100; // 100ms
    
    unsigned long now = millis();
    if (now - lastUpdate >= updateInterval) {
        lastUpdate = now;
        
        // Your periodic logic here
        performUpdate();
    }
}
```

## Example: Complete Process Implementation

Here's a complete example of a simple LED blink process:

```cpp
// include/processes/BlinkProcess.h
#ifndef BLINK_PROCESS_H
#define BLINK_PROCESS_H

#include "Process.h"
#include "config.h"
#include "CommandRegistry.h"

class BlinkProcess : public Process {
public:
    BlinkProcess() : Process(), blinkPin(13), blinkRate(500), lastBlink(0), ledState(false) {}

    void setup() override {
        pinMode(blinkPin, OUTPUT);
        digitalWrite(blinkPin, LOW);
        registerCommands();
        Serial.println("BlinkProcess initialized");
    }

    void update() override {
        if (!isProcessRunning()) return;
        
        unsigned long now = millis();
        if (now - lastBlink >= blinkRate) {
            lastBlink = now;
            ledState = !ledState;
            digitalWrite(blinkPin, ledState ? HIGH : LOW);
        }
    }

    String getState() override {
        return "Blinking at " + String(blinkRate) + "ms";
    }

private:
    int blinkPin;
    unsigned long blinkRate;
    unsigned long lastBlink;
    bool ledState;
    
    void registerCommands() {
        commandRegistry.registerCommand("blinkrate", [this](const String& params) {
            unsigned long rate = params.toInt();
            if (rate >= 50 && rate <= 5000) {
                blinkRate = rate;
                Serial.print("Blink rate set to: ");
                Serial.println(rate);
            } else {
                Serial.println("Invalid rate: 50-5000ms");
            }
        });
        
        commandRegistry.registerCommand("blinkstop", [this](const String& params) {
            halt();
            digitalWrite(blinkPin, LOW);
            Serial.println("Blink stopped");
        });
        
        commandRegistry.registerCommand("blinkstart", [this](const String& params) {
            start();
            Serial.println("Blink started");
        });
    }
};

#endif // BLINK_PROCESS_H
```

This process can be added to main.cpp and will provide LED blinking functionality with configurable rate and start/stop commands.
