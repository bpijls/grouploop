#include "processes/LedBehaviors.h"

// --- Global LED Behavior Instances ---
// These instances are defined here and available globally

// Basic behaviors
LedsOffBehavior ledsOff;
SolidBehavior ledsSolid;
BreathingBehavior ledsBreathing(0xFFFFFF, 2000);
HeartBeatBehavior ledsHeartBeat;
CycleBehavior ledsCycle(0x000000, 100);

// Pre-configured common solid colors
SolidBehavior ledsRed(0xFF0000);      // Red
SolidBehavior ledsGreen(0x00FF00);    // Green
SolidBehavior ledsBlue(0x0000FF);     // Blue
SolidBehavior ledsWhite(0xFFFFFF);    // White
SolidBehavior ledsYellow(0xFFFF00);   // Yellow
SolidBehavior ledsCyan(0x00FFFF);     // Cyan
SolidBehavior ledsMagenta(0xFF00FF);  // Magenta

// Pre-configured breathing behaviors
BreathingBehavior ledsBreathingRed(0xFF0000, 2000);    // Red breathing, 2 second cycle
BreathingBehavior ledsBreathingGreen(0x00FF00, 2000);  // Green breathing, 2 second cycle
BreathingBehavior ledsBreathingBlue(0x0000FF, 2000);   // Blue breathing, 2 second cycle

// Pre-configured heartbeat behaviors
HeartBeatBehavior ledsHeartBeatRed(0xFF0000, 770, 2000);    // Red heartbeat, 770ms beat, 2s cycle
HeartBeatBehavior ledsHeartBeatGreen(0x00FF00, 770, 2000);  // Green heartbeat, 770ms beat, 2s cycle
HeartBeatBehavior ledsHeartBeatBlue(0x0000FF, 770, 2000);   // Blue heartbeat, 770ms beat, 2s cycle
