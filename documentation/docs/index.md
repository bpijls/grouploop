# GroupLoop

A modular system for real-time interaction with a swarm of physical devices over WebSockets. Devices stream sensor data (accelerometer and beacon RSSI) and accept control commands (vibration motor and RGB LEDs). The stack includes a WebSocket server, web clients, simulators/emulators for development, and a CDN for shared libraries — all containerized via Docker.

## Command protocol (overview)

All commands and device responses are ASCII-hex, newline-terminated. Multi-byte values are big-endian.

- L\n: List device IDs (server replies with IDs, one per line)
- I\n: Devices reply with their 2-byte ID (4 hex chars)
- C<id><RR><GG><BB>\n: Set color on device
- M<id><SS><TT>\n: Motor strength and duration (1 byte each)
- R<id>\n: One-shot sensor sample from device
- R<id><FF>\n: Stream sensors at FF Hz; FF=00 stops streaming

See Sensor Data Protocol for the payload format.

## Goals

- Enable rapid prototyping and visualization of many devices concurrently
- Provide consistent device data models and control APIs across apps
- Support development without hardware via simulation and emulation
- Share common client libraries through a CDN for reuse across demos

## Components

- `grouploop-firmware`: Firmware for the device hardware. Publishes accelerometer values and beacon RSSI via WebSocket; receives motor/LED commands.
- `socket-server`: WebSocket backend. Manages device/client connections and message routing.
- `socket-client`: Reference web UI to observe device state and send commands.
- `socket-simulator`: Simulates a swarm of devices (message shape compatible with real devices) for load and UX testing.
- `device-emulator`: Mobile-friendly emulator for creating virtual devices without hardware.
- `cdn-server`: Serves shared JS libraries and firmware files (e.g., `HitloopDevice.js`, `HitloopDeviceManager.js`, `p5.min.js`).
- `documentation`: MkDocs site with architecture and how-tos.

## High-level architecture

```mermaid
flowchart LR
  subgraph Clients
    C1["socket-client (web UI)"]
    C2["socket-demo (p5 scenes)"]
    C3["custom apps"]
  end

  subgraph Sources
    D1["Physical devices\n(grouploop-firmware)"]
    S1["socket-simulator"]
    E1["device-emulator"]
  end

  WS["socket-server\n(WebSocket)"]
  CDN["cdn-server\n(static JS/firmware)"]

  D1 -- WS --> WS
  S1 -- WS --> WS
  E1 -- WS --> WS

  WS -- WS --> C1
  WS -- WS --> C2
  WS -- WS --> C3

  CDN -- HTTP --> C1
  CDN -- HTTP --> C2
  CDN -- HTTP --> C3
```

## Data model and message flow

- Devices (real/sim/emulated) open a WebSocket to the server and stream frames with accelerometer (ax, ay, az) and beacon RSSI (dNW, dNE, dSW, dSE) plus metadata (id, color, motor state).
- Clients subscribe over WebSocket and render device state. Control commands (e.g., vibrate, LED color) are sent back over the same socket, routed to targets by the server.
- Shared parsing and device abstractions live in CDN-delivered libraries `HitloopDevice.js` and `HitloopDeviceManager.js` used across apps like `socket-client` and `socket-demo`.

```mermaid
sequenceDiagram
  participant Dev as Device/Simulator/Emulator
  participant WS as socket-server
  participant UI as Client App

  Dev->>WS: connect()
  loop stream
    Dev->>WS: sensorFrame { id, ax, ay, az, dNW, dNE, dSW, dSE }
    WS-->>UI: broadcast/update frame
  end
  UI->>WS: command { id, motor:on, led:[r,g,b] }
  WS-->>Dev: route command
```

## Runtime and environment

Container orchestration is defined in `docker-compose.yml`.

- WebSocket default URL: `WS_DEFAULT_URL` (default `ws://feib.nl:5003`)
- CDN base URL: `CDN_BASE_URL` (default `http://cdn.hitloop.feib.nl`)
- Services (ports):
  - `socket` (server): 5003→5000
  - `client` (UI): 5004→5000
  - `cdn_server` (CDN): 5008→5000
  - `simulator` (UI): 5005→5000
  - `device_emulator` (UI): 5007→5000
  - `docs` (MkDocs): 5006→5000

Client apps read `WS_DEFAULT_URL` and `CDN_BASE_URL` and include shared libraries from the CDN, e.g. in `socket-demo/index.html`:

```html
<script src="http://cdn.hitloop.feib.nl/js/p5.min.js"></script>
<script src="http://cdn.hitloop.feib.nl/js/p5.sound.min.js"></script>
<script src="http://cdn.hitloop.feib.nl/js/HitloopDevice.js"></script>
<script src="http://cdn.hitloop.feib.nl/js/HitloopDeviceManager.js"></script>
```

## Getting started

1. Install Docker and Docker Compose.
2. From the repo root, start the stack:
   - `docker compose up --build`
3. Open the UIs:
   - Docs: `http://localhost:5006`
   - Client UI: `http://localhost:5004`
   - Simulator: `http://localhost:5005`
   - Emulator: `http://localhost:5007`
   - CDN: `http://localhost:5008`

## Component references

- Hardware and firmware: `docs/hardware/`
- Socket demo (p5 scenes): `docs/socket-demo/`
- Server details: `socket-server/README.md`

## For contributors and AI agents

- Prefer using the CDN-hosted device libraries to keep parsing and models consistent across apps.
- Keep message schema stable: ids are hex strings; sensor values are 0–255. Add fields behind feature flags to maintain compatibility.
- When adding a new app, parameterize WebSocket URL and CDN base URL via env vars.

