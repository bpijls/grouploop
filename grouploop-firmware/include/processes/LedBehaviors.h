#ifndef LED_BEHAVIORS_H
#define LED_BEHAVIORS_H

#include <Adafruit_NeoPixel.h>
#include "Timer.h"
#include "Utils.h"

// --- LED Behavior Base Class ---
class LedBehavior {
public:
    const char* type;
    virtual ~LedBehavior() {}
    virtual void setup(Adafruit_NeoPixel& pixels) {
        this->pixels = &pixels;
    }
    virtual void update() = 0;
    virtual void updateParams() {}

protected:
    LedBehavior(const char* type) : type(type) {}
    Adafruit_NeoPixel* pixels;
    uint32_t scaleColor(uint32_t color, uint8_t brightness) {
        uint8_t r = (uint8_t)(((color >> 16) & 0xFF) * brightness / 255);
        uint8_t g = (uint8_t)(((color >> 8) & 0xFF) * brightness / 255);
        uint8_t b = (uint8_t)((color & 0xFF) * brightness / 255);
        return pixels->Color(r, g, b);
    }
};

// --- Concrete LED Behaviors ---

// 1. LedsOffBehavior
class LedsOffBehavior : public LedBehavior {
public:
    LedsOffBehavior() : LedBehavior("Off") {}
    void setup(Adafruit_NeoPixel& pixels) override {
        LedBehavior::setup(pixels);
        this->pixels->clear();
        this->pixels->show();
    }
    void update() override {
        // Do nothing, LEDs are off
    }
};

// 2. SolidBehavior
class SolidBehavior : public LedBehavior {
public:
    uint32_t color;
    SolidBehavior(uint32_t color = 0) : LedBehavior("Solid"), color(color) {}
  
    void setup(Adafruit_NeoPixel& pixels) override {
        LedBehavior::setup(pixels);
        this->pixels->fill(color);
        this->pixels->show();
    }
    void update() override {
        // Do nothing, color is set in setup.
    }
};

// 2. BreathingBehavior
class BreathingBehavior : public LedBehavior {
public:
    uint32_t color;
    uint32_t duration;
    BreathingBehavior(uint32_t color, uint32_t duration) : LedBehavior("Breathing"), color(color), updateTimer(1000 / 50), duration(duration) {} // 50Hz for smooth animation

    void setup(Adafruit_NeoPixel& pixels) override {
        LedBehavior::setup(pixels);
        updateTimer.reset();
    }

    void update() override {
        if (updateTimer.checkAndReset()) {
            float sine_wave = sin(millis() * 2.0 * PI / duration); // 4-second period
            uint8_t brightness = (uint8_t)(((sine_wave + 1.0) / 2.0) * 255.0);
            pixels->fill(scaleColor(color, brightness));
            pixels->show();
        }
    }

private:
    Timer updateTimer;
};

// 3. HeartBeatBehavior
class HeartBeatBehavior : public LedBehavior {
public:
    uint32_t color;
    unsigned long pulse_duration;
    unsigned long pulse_interval;

    HeartBeatBehavior(uint32_t color = 0, unsigned long duration = 770, unsigned long interval = 2000) 
        : LedBehavior("HeartBeat"), 
          color(color), 
          pulse_duration(duration), 
          pulse_interval(interval), 
          intervalTimer(interval), 
          beatTimer(0), // interval is set dynamically
          state(IDLE) {}    

    void setup(Adafruit_NeoPixel& pixels) override {
        LedBehavior::setup(pixels);
        state = IDLE;
        intervalTimer.reset();
        this->pixels->clear();
        this->pixels->show();
    }

    void update() override {
        switch (state) {
            case IDLE:
                if (intervalTimer.checkAndReset()) {
                    state = FADE_IN_1;
                    beatTimer.interval = getScaledDuration(FADE_IN_1_DUR);
                    beatTimer.reset();
                }
                break;
            case FADE_IN_1: {
                unsigned long elapsed = millis() - beatTimer.last_update;
                if (elapsed >= beatTimer.interval) {
                    pixels->fill(color);
                    pixels->show();
                    state = FADE_OUT_1;
                    beatTimer.interval = getScaledDuration(FADE_OUT_1_DUR);
                    beatTimer.reset();
                } else {
                    uint8_t brightness = (elapsed * 255) / beatTimer.interval;
                    pixels->fill(scaleColor(color, brightness));
                    pixels->show();
                }
                break;
            }
            case FADE_OUT_1: {
                 unsigned long elapsed = millis() - beatTimer.last_update;
                if (elapsed >= beatTimer.interval) {
                    pixels->clear();
                    pixels->show();
                    state = PAUSE;
                    beatTimer.interval = getScaledDuration(PAUSE_DUR);
                    beatTimer.reset();
                } else {
                    uint8_t brightness = 255 - (elapsed * 255 / beatTimer.interval);
                    pixels->fill(scaleColor(color, brightness));
                    pixels->show();
                }
                break;
            }
            case PAUSE:
                if (beatTimer.checkAndReset()) {
                    state = FADE_IN_2;
                    beatTimer.interval = getScaledDuration(FADE_IN_2_DUR);
                    beatTimer.reset();
                }
                break;
            case FADE_IN_2: {
                 unsigned long elapsed = millis() - beatTimer.last_update;
                if (elapsed >= beatTimer.interval) {
                    pixels->fill(color);
                    pixels->show();
                    state = FADE_OUT_2;
                    beatTimer.interval = getScaledDuration(FADE_OUT_2_DUR);
                    beatTimer.reset();
                } else {
                    uint8_t brightness = (elapsed * 255) / beatTimer.interval;
                    pixels->fill(scaleColor(color, brightness));
                    pixels->show();
                }
                break;
            }
            case FADE_OUT_2: {
                unsigned long elapsed = millis() - beatTimer.last_update;
                if (elapsed >= beatTimer.interval) {
                    pixels->clear();
                    pixels->show();
                    state = IDLE;
                } else {
                    uint8_t brightness = 255 - (elapsed * 255 / beatTimer.interval);
                    pixels->fill(scaleColor(color, brightness));
                    pixels->show();
                }
                break;
            }
        }
    }

    void setParams(uint32_t c, unsigned long dur, unsigned long inter) {
        color = c;
        pulse_duration = dur;
        pulse_interval = inter;
        intervalTimer.interval = inter;
    }

private:
    enum BeatState { IDLE, FADE_IN_1, FADE_OUT_1, PAUSE, FADE_IN_2, FADE_OUT_2 };
    BeatState state;
    Timer intervalTimer; // Time between heartbeats
    Timer beatTimer;   // Time for individual fades/pauses

    static const unsigned long BASE_DURATION = 770;
    static const unsigned long FADE_IN_1_DUR = 60;
    static const unsigned long FADE_OUT_1_DUR = 150;
    static const unsigned long PAUSE_DUR = 100;
    static const unsigned long FADE_IN_2_DUR = 60;
    static const unsigned long FADE_OUT_2_DUR = 400;

    unsigned long getScaledDuration(unsigned long base_part_duration) {
        if (pulse_duration == 0 || BASE_DURATION == 0) return 0;
        return (base_part_duration * pulse_duration) / BASE_DURATION;
    }
};


// 4. CycleBehavior
class CycleBehavior : public LedBehavior {
public:
    uint32_t color;
    int delay;
    CycleBehavior(uint32_t color, int delay) : LedBehavior("Cycle"), color(color), delay(delay), updateTimer(delay) {}

    // void updateParams(JsonObject& params) override {
    //     color = hexToColor(params["color"].as<String>());
    //     delay = params["delay"].as<int>();
    // }

    void setup(Adafruit_NeoPixel& pixels) override {
        LedBehavior::setup(pixels);
        updateTimer.reset();
        currentPixel = 0;
    }

    void update() override {
        if (updateTimer.checkAndReset()) {
            pixels->clear();
            pixels->setPixelColor(currentPixel, color);
            pixels->show();
            currentPixel = (currentPixel + 1) % pixels->numPixels();
        }
    }

private:
    Timer updateTimer;
    int currentPixel;
};

// --- Global LED Behavior Instances ---
// These instances are available globally to any file that includes LedBehaviors.h

// Basic behaviors
extern LedsOffBehavior ledsOff;
extern SolidBehavior ledsSolid;
extern BreathingBehavior ledsBreathing;
extern HeartBeatBehavior ledsHeartBeat;
extern CycleBehavior ledsCycle;

// Pre-configured common behaviors
extern SolidBehavior ledsRed;
extern SolidBehavior ledsGreen;
extern SolidBehavior ledsBlue;
extern SolidBehavior ledsWhite;
extern SolidBehavior ledsYellow;
extern SolidBehavior ledsCyan;
extern SolidBehavior ledsMagenta;

// Pre-configured breathing behaviors
extern BreathingBehavior ledsBreathingRed;
extern BreathingBehavior ledsBreathingGreen;
extern BreathingBehavior ledsBreathingBlue;

// Pre-configured heartbeat behaviors
extern HeartBeatBehavior ledsHeartBeatRed;
extern HeartBeatBehavior ledsHeartBeatGreen;
extern HeartBeatBehavior ledsHeartBeatBlue;

#endif // LED_BEHAVIORS_H 