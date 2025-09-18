/*
 * WebSocketClient.ino
 *
 *  Created on: 24.05.2015
 *
 */

 #include <Arduino.h>

 #include <WiFi.h>
 #include <WiFiMulti.h>
 #include <WiFiClientSecure.h>
 
 #include <WebSocketsClient.h>
 
#include <Wire.h>
#include "SparkFun_LIS2DH12.h"

 
WiFiMulti wifiMulti;
 WebSocketsClient webSocket;
SPARKFUN_LIS2DH12 accel;

volatile bool wsConnected = false;
unsigned long lastAccelSendMs = 0;
const unsigned long accelSendIntervalMs = 100; // 10 Hz
 
 #define USE_SERIAL Serial
 
 void hexdump(const void *mem, uint32_t len, uint8_t cols = 16) {
     const uint8_t* src = (const uint8_t*) mem;
     USE_SERIAL.printf("\n[HEXDUMP] Address: 0x%08X len: 0x%X (%d)", (ptrdiff_t)src, len, len);
     for(uint32_t i = 0; i < len; i++) {
         if(i % cols == 0) {
             USE_SERIAL.printf("\n[0x%08X] 0x%08X: ", (ptrdiff_t)src, i);
         }
         USE_SERIAL.printf("%02X ", *src);
         src++;
     }
     USE_SERIAL.printf("\n");
 }
 
 void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
 
     switch(type) {
         case WStype_DISCONNECTED:
             USE_SERIAL.printf("[WSc] Disconnected!\n");
            wsConnected = false;
             break;
         case WStype_CONNECTED:
             USE_SERIAL.printf("[WSc] Connected to url: %s\n", payload);
 
             // send message to server when Connected
             webSocket.sendTXT("Connected");
            wsConnected = true;
             break;
         case WStype_TEXT:
             USE_SERIAL.printf("[WSc] get text: %s\n", payload);
 
             // send message to server
             // webSocket.sendTXT("message here");
             break;
         case WStype_BIN:
             USE_SERIAL.printf("[WSc] get binary length: %u\n", length);
             hexdump(payload, length);
 
             // send data to server
             // webSocket.sendBIN(payload, length);
             break;
         case WStype_ERROR:			
         case WStype_FRAGMENT_TEXT_START:
         case WStype_FRAGMENT_BIN_START:
         case WStype_FRAGMENT:
         case WStype_FRAGMENT_FIN:
             break;
     }
 
 }
 
 void setup() {
     // USE_SERIAL.begin(921600);
     USE_SERIAL.begin(115200);
 
     //Serial.setDebugOutput(true);
     USE_SERIAL.setDebugOutput(true);
 
     USE_SERIAL.println();
     USE_SERIAL.println();
     USE_SERIAL.println();
 
     for(uint8_t t = 4; t > 0; t--) {
         USE_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
         USE_SERIAL.flush();
         delay(1000);
     }
 
    wifiMulti.addAP("iotroam", "rpRhDnGd0Q");
 
     //WiFi.disconnect();
    while(wifiMulti.run() != WL_CONNECTED) {
         delay(100);
     }
 
     // server address, port and URL
     webSocket.begin("feib.nl", 5003, "/");
 
     // event handler
     webSocket.onEvent(webSocketEvent);
 
     
     // try ever 5000 again if connection has failed
     webSocket.setReconnectInterval(5000);

	// Initialize I2C and accelerometer
	Wire.begin();
	Wire.setClock(1000000);
	if (accel.begin() == false) {
		USE_SERIAL.println("[LIS2DH12] Accelerometer not detected. Check wiring.");
	} else {
		accel.setMode(LIS2DH12_HR_12bit);
		accel.setDataRate(LIS2DH12_ODR_100Hz);
		USE_SERIAL.println("[LIS2DH12] Initialized.");
	}
 }
 
 void loop() {
	webSocket.loop();

	// Periodically read accelerometer and send over websocket
	unsigned long nowMs = millis();
	if (nowMs - lastAccelSendMs >= accelSendIntervalMs) {
		lastAccelSendMs = nowMs;
		if (accel.available()) {
			float ax = accel.getX() / 980.0f; // convert mg to g
			float ay = accel.getY() / 980.0f;
			float az = accel.getZ() / 980.0f;

			if (wsConnected) {
				String msg = String("{\"ax\":") + String(ax, 3) +
					String(",\"ay\":") + String(ay, 3) +
					String(",\"az\":") + String(az, 3) + String("}");
				webSocket.sendTXT(msg);
			}
		}
	}
 }
 