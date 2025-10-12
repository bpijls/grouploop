#ifndef PUBLISH_PROCESS_H
#define PUBLISH_PROCESS_H

#include "Process.h"
#include "Timer.h"
#include "Configuration.h"
#include "processes/BLEProcess.h"
#include "processes/IMUProcess.h"
#include <WebSocketsClient.h>
#include <WiFi.h>

class PublishProcess : public Process {

private:
	BleProcess* bleProcess;
	IMUProcess* imuProcess;
	Timer publishTimer; // send interval
	WebSocketsClient webSocket;
	bool connected = false;
	String wsHost;
	int wsPort = 80;
	String wsPath = "/";
	String deviceIdHex;
	String state;

	static int clampInt(int v, int lo, int hi) { return v < lo ? lo : (v > hi ? hi : v); }
	static String toHexByte(int v) { char buf[3]; snprintf(buf, sizeof(buf), "%02x", clampInt(v, 0, 255)); return String(buf); }
	static String toHexWord(uint16_t v) { char buf[5]; snprintf(buf, sizeof(buf), "%04x", v); return String(buf); }
	static int mapFloatToByte(float v, float inMin, float inMax) {
		if (v < inMin) v = inMin; if (v > inMax) v = inMax;
		float t = (v - inMin) / (inMax - inMin);
		int b = (int)lroundf(t * 255.0f);
		return clampInt(b, 0, 255);
	}
	static int mapRssiToByte(int rssiDbm) {
		// Simple linear map: -100 dBm -> 0, -40 dBm -> 255
		if (rssiDbm < -100) rssiDbm = -100; if (rssiDbm > -40) rssiDbm = -40;
		float t = (float)(rssiDbm + 100) / 60.0f; // 0..1
		int b = (int)lroundf(t * 255.0f);
		return clampInt(b, 0, 255);
	}

	String buildFrame() const {
		// IMU
		IMUData imu = imuProcess ? imuProcess->getIMUData() : IMUData{0,0,0};
		int ax = mapFloatToByte(imu.x_g, -2.0f, 2.0f);
		int ay = mapFloatToByte(imu.y_g, -2.0f, 2.0f);
		int az = mapFloatToByte(imu.z_g, -2.0f, 2.0f);
		// BLE beacons
		int dNE = 0, dNW = 0, dSE = 0, dSW = 0;
		if (bleProcess) {
			dNE = mapRssiToByte(bleProcess->getBeaconRSSI("NE"));
			dNW = mapRssiToByte(bleProcess->getBeaconRSSI("NW"));
			dSE = mapRssiToByte(bleProcess->getBeaconRSSI("SE"));
			dSW = mapRssiToByte(bleProcess->getBeaconRSSI("SW"));
		}
		// Tap detection
		int tap = imuProcess ? (imuProcess->isTapped() ? 255 : 0) : 0;
		
		String frame;
		frame.reserve(4 + 2*8 + 1); // Updated to account for tap byte
		frame += deviceIdHex;
		frame += toHexByte(ax);
		frame += toHexByte(ay);
		frame += toHexByte(az);
		frame += toHexByte(dNW); // simulator expects TL->dNW first
		frame += toHexByte(dNE);
		frame += toHexByte(dSE);
		frame += toHexByte(dSW);
		frame += toHexByte(tap); // Tap detection: 0 if not tapped, 255 if tapped
		frame += "\n";
		return frame;
	}

public:
	PublishProcess()
		: Process()
		, bleProcess(nullptr)
		, imuProcess(nullptr)
		, publishTimer(50) // 20 Hz
		, connected(false)
		, deviceIdHex("0000")
		, state("DISCONNECTED")
	{}

	void setup() override {
		// Build a 16-bit device id from MAC last 2 bytes to match tests/sim
		uint8_t mac[6];
		WiFi.macAddress(mac);
		char idBuf[5];
		snprintf(idBuf, sizeof(idBuf), "%02X%02X", mac[4], mac[5]);
		deviceIdHex = String(idBuf);
		// Parse ws URL and connect
		parseAndConnect(configuration.getSocketServerURL());
	}

	void update() override {
		webSocket.loop();
		state = connected ? String("CONNECTED") : String("CONNECTING");
		if (connected && publishTimer.checkAndReset()) {
			String frame = buildFrame(); // mutable lvalue for sendTXT(String&)
			webSocket.sendTXT(frame);
		}
	}

	void setProcesses(std::map<String, Process*>* processes){
		if (!processes) return;
		auto itBle = processes->find("ble");
		if (itBle != processes->end()) bleProcess = static_cast<BleProcess*>(itBle->second);
		auto itImu = processes->find("imu");
		if (itImu != processes->end()) imuProcess = static_cast<IMUProcess*>(itImu->second);
	}

	String getDeviceId() const { return deviceIdHex; }
	String getState() const { return state; }

private:
	void parseAndConnect(const String &wsUrl) {
		if (!wsUrl.startsWith("ws://")) return;
		String rest = wsUrl.substring(5);
		int slash = rest.indexOf('/');
		String hostPort = slash >= 0 ? rest.substring(0, slash) : rest;
		wsPath = slash >= 0 ? rest.substring(slash) : "/";
		int colon = hostPort.indexOf(':');
		if (colon >= 0) {
			wsHost = hostPort.substring(0, colon);
			wsPort = hostPort.substring(colon + 1).toInt();
		} else {
			wsHost = hostPort;
			wsPort = 80;
		}
		webSocket.onEvent([this](WStype_t type, uint8_t * payload, size_t length) {
			if (type == WStype_CONNECTED) connected = true;
			else if (type == WStype_DISCONNECTED) connected = false;
		});
		webSocket.setReconnectInterval(5000);
		webSocket.begin(wsHost.c_str(), wsPort, wsPath.c_str());
	}
};

#endif // PUBLISH_PROCESS_H 
