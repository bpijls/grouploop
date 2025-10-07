#ifndef PROCESS_H
#define PROCESS_H

#include "Arduino.h"

class EventManager; // Forward declaration

class Process {

public:
    virtual ~Process() {}
    virtual void setup() { }
    virtual void update() = 0;
    virtual String getState() { return String(); }

};

#endif // PROCESS_H 