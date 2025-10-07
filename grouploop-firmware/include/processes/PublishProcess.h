#ifndef PUBLISH_PROCESS_H
#define PUBLISH_PROCESS_H

#include "Arduino.h"
#include "Process.h"
#include "Timer.h"
#include <map>

class PublishProcess : public Process {
public:
    PublishProcess() : Process(), processes(nullptr) {}

    void setProcesses(std::map<String, Process*>* processes) {
        this->processes = processes;
    }

    void setup() override {
    }

    void update() override {
    }    

    String getState() override { return String(); }

private:
    std::map<String, Process*>* processes;
    String deviceId;
};

#endif // PUBLISH_PROCESS_H