# GroupLoop Data Flow

This document describes how data flows through the GroupLoop system, from sensor readings on physical devices to client applications and back through command execution.

## System Data Flow Overview

```mermaid
graph TB
    subgraph "Physical Layer"
        DEVICE[Physical Device<br/>ESP32-C3]
        BEACONS[BLE Beacons<br/>Position Reference]
        SENSORS[IMU Sensor<br/>Accelerometer]
    end
    
    subgraph "Firmware Layer"
        PROCESSES[Process Manager<br/>LED, IMU, BLE, etc.]
        WEBSOCKET[WebSocket Manager]
        COMMANDS[Command Registry]
    end
    
    subgraph "Network Layer"
        SERVER[WebSocket Server<br/>socket-server]
        CDN[CDN Server<br/>Static Files]
    end
    
    subgraph "Application Layer"
        CLIENT[Client Applications<br/>socket-client, device-control]
        SIM[Simulator<br/>socket-simulator]
        EMU[Emulator<br/>device-emulator]
        DEMO[Demo Apps<br/>p5.js scenes]
    end
    
    BEACONS -->|BLE RSSI| DEVICE
    SENSORS -->|Accelerometer Data| DEVICE
    DEVICE --> PROCESSES
    PROCESSES --> WEBSOCKET
    WEBSOCKET -->|WebSocket| SERVER
    SERVER -->|Broadcast| CLIENT
    SERVER -->|Broadcast| SIM
    SERVER -->|Broadcast| EMU
    SERVER -->|Broadcast| DEMO
    
    CLIENT -->|Commands| SERVER
    SERVER -->|Route Commands| WEBSOCKET
    WEBSOCKET --> COMMANDS
    COMMANDS --> PROCESSES
    
    CDN -->|JS Libraries| CLIENT
    CDN -->|JS Libraries| SIM
    CDN -->|JS Libraries| EMU
    CDN -->|JS Libraries| DEMO
```

## Device Data Flow

### Sensor Data Collection

```mermaid
sequenceDiagram
    participant IMU as IMU Process
    participant BLE as BLE Process
    participant PUB as Publish Process
    participant WS as WebSocket Manager
    participant SERVER as WebSocket Server
    
    loop Every 20ms
        IMU->>IMU: Read accelerometer
        BLE->>BLE: Scan for beacons
        PUB->>PUB: Format sensor frame
        PUB->>WS: Send hex frame
        WS->>SERVER: WebSocket message
        SERVER->>SERVER: Broadcast to clients
    end
```

### Command Processing

```mermaid
sequenceDiagram
    participant CLIENT as Client App
    participant SERVER as WebSocket Server
    participant WS as WebSocket Manager
    participant REG as Command Registry
    participant PROC as Target Process
    
    CLIENT->>SERVER: cmd:device_id:command:params
    SERVER->>WS: Route to device
    WS->>REG: Execute command
    REG->>PROC: Call handler function
    PROC->>PROC: Execute action
    PROC->>REG: Command result
    REG->>WS: Log result
    WS->>SERVER: Status update
    SERVER->>CLIENT: Command confirmation
```

## Client Data Flow

### Data Reception and Processing

```mermaid
graph LR
    subgraph "Client Application"
        WS[WebSocket Client]
        PARSER[Data Parser]
        DEVICE_MGR[Device Manager]
        UI[User Interface]
    end
    
    subgraph "External"
        SERVER[WebSocket Server]
        CDN[CDN Server]
    end
    
    SERVER -->|Sensor Frames| WS
    WS --> PARSER
    PARSER --> DEVICE_MGR
    DEVICE_MGR --> UI
    
    CDN -->|JS Libraries| DEVICE_MGR
    UI -->|Commands| WS
    WS -->|Commands| SERVER
```

### Command Sending Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant MGR as Device Manager
    participant WS as WebSocket Client
    participant SERVER as WebSocket Server
    participant DEVICE as Physical Device
    
    UI->>MGR: User action (e.g., set LED color)
    MGR->>MGR: Format command
    MGR->>WS: Send command
    WS->>SERVER: WebSocket message
    SERVER->>DEVICE: Route command
    DEVICE->>DEVICE: Execute command
    DEVICE->>SERVER: Command result
    SERVER->>WS: Status update
    WS->>MGR: Update device state
    MGR->>UI: Refresh display
```

## Data Transformation Pipeline

### Device to Client

```mermaid
graph LR
    subgraph "Device Side"
        RAW[Raw Sensor Data<br/>IMU: 3x float<br/>BLE: 4x RSSI]
        HEX[Hex Encoding<br/>20 characters]
    end
    
    subgraph "Network"
        WS[WebSocket Message<br/>ASCII string]
    end
    
    subgraph "Client Side"
        PARSE[Parse Hex Frame]
        OBJECT[Device Object<br/>Structured data]
        RENDER[UI Rendering<br/>Visual representation]
    end
    
    RAW --> HEX
    HEX --> WS
    WS --> PARSE
    PARSE --> OBJECT
    OBJECT --> RENDER
```

### Client to Device

```mermaid
graph LR
    subgraph "Client Side"
        ACTION[User Action<br/>Button click, etc.]
        CMD[Command Object<br/>{command, params}]
        STR[Command String<br/>cmd:device:command:params]
    end
    
    subgraph "Network"
        WS[WebSocket Message]
    end
    
    subgraph "Device Side"
        PARSE[Parse Command]
        REG[Command Registry]
        EXEC[Execute Handler]
        RESULT[Command Result]
    end
    
    ACTION --> CMD
    CMD --> STR
    STR --> WS
    WS --> PARSE
    PARSE --> REG
    REG --> EXEC
    EXEC --> RESULT
```

## Real-time Data Characteristics

### Update Frequencies

| Component | Frequency | Data Size | Purpose |
|-----------|-----------|-----------|---------|
| IMU Data | 50 Hz | 6 bytes | Motion detection |
| BLE RSSI | 10 Hz | 8 bytes | Position tracking |
| LED State | On change | 2 bytes | Visual feedback |
| Motor State | On change | 2 bytes | Haptic feedback |
| Commands | On demand | 20-50 bytes | Device control |

### Data Volume Estimates

**Per Device (50 Hz sensor updates)**:
- Sensor frames: 20 bytes × 50 Hz = 1 KB/s
- Commands: ~100 bytes/s (typical usage)
- **Total**: ~1.1 KB/s per device

**System Capacity**:
- 100 devices: ~110 KB/s
- 1000 devices: ~1.1 MB/s
- Network overhead: ~20-30% additional

## Data Persistence

### Device Configuration
- **Storage**: ESP32 NVS (Non-Volatile Storage)
- **Format**: JSON configuration
- **Persistence**: Survives power cycles
- **Updates**: Via configuration commands

### Server State
- **Device Registry**: In-memory (lost on restart)
- **Command Registry**: Loaded from CDN on startup
- **Connection State**: WebSocket session-based

### Client State
- **Device Data**: In-memory, real-time updates
- **UI State**: Browser session storage
- **Configuration**: Environment variables

## Error Handling and Recovery

### Device Errors
```mermaid
graph TD
    ERROR[Device Error]
    ERROR --> LOG[Log Error]
    ERROR --> RETRY[Retry Operation]
    ERROR --> FALLBACK[Fallback Behavior]
    RETRY --> SUCCESS{Success?}
    SUCCESS -->|Yes| CONTINUE[Continue Operation]
    SUCCESS -->|No| FALLBACK
    FALLBACK --> RECOVER[Recovery Mode]
```

### Network Errors
- **Connection Lost**: Automatic reconnection
- **Message Corruption**: Discard and continue
- **Command Timeout**: Retry with backoff
- **Server Overload**: Client-side queuing

### Data Validation
- **Hex Frame Format**: Validate 20-character length
- **Command Format**: Parse and validate parameters
- **Range Checking**: Ensure values within expected ranges
- **Type Validation**: Verify data types match expectations
