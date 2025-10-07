#ifndef PROCESS_H
#define PROCESS_H


class EventManager; // Forward declaration

class Process {

public:
    virtual ~Process() {}
    virtual void setup() { }
    virtual void update() = 0;

};

#endif // PROCESS_H 