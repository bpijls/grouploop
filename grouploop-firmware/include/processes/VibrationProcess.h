#ifndef VIBRATION_PROCESS_H
#define VIBRATION_PROCESS_H

#include <Arduino.h>
#include "Process.h"
#include "config.h"
#include "VibrationBehaviors.h"

class VibrationProcess : public Process {
public:
    VibrationProcess() : Process(), currentBehavior(nullptr) {
    }

    ~VibrationProcess() {
    }

    void setBehavior(VibrationBehavior* newBehavior) {
        currentBehavior = newBehavior;
        if (currentBehavior) {
            currentBehavior->setup();
        }
    }

    void update() override {
        if (currentBehavior) {
            currentBehavior->update();
        }
    }

    VibrationBehavior* currentBehavior;

private:
    // No private members
};

#endif // VIBRATION_PROCESS_H 