#ifndef TIMER_H
#define TIMER_H

#include "Arduino.h"

struct Timer {
    unsigned long last_update;
    unsigned long interval;

    Timer(unsigned long an_interval) : interval(an_interval), last_update(0) {}
    Timer() : interval(0), last_update(0) {}

    bool hasElapsed() {
        return millis() - last_update > interval;
    }

    bool checkAndReset() {
        if (interval == 0) return false;
        
        if (hasElapsed()) {
            reset();
            return true;
        }
        return false;
    }

    void reset() {
        last_update = millis();
    }
};

#endif // TIMER_H 