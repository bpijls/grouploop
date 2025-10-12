# GroupLoop Architecture Overview

GroupLoop is a modular system for real-time interaction with a swarm of physical devices over WebSockets. The system enables rapid prototyping and visualization of many devices concurrently, providing consistent device data models and control APIs across applications.

## System Architecture

```mermaid
graph TB
    subgraph "Physical Layer"
        D1[Physical Devices<br/>ESP32-C3 + Sensors]
        D2[BLE Beacons<br/>Position Reference]
    end
    
    subgraph "Network Layer"
        WS[WebSocket Server<br/>socket-server:5003]
        CDN[CDN Server<br/>cdn-server:5008]
    end
    
    subgraph "Application Layer"
        CLIENT[Client UI<br/>socket-client:5004]
        CONTROL[Device Control<br/>device-control:5009]
        SIM[Simulator<br/>socket-simulator:5005]
        EMU[Device Emulator<br/>device-emulator:5007]
        DEMO[Socket Demo<br/>p5.js Scenes]
    end
    
    subgraph "Development Tools"
        DOCS[Documentation<br/>docs:5006]
    end
    
    D1 -->|WebSocket| WS
    D2 -->|BLE| D1
    WS -->|WebSocket| CLIENT
    WS -->|WebSocket| CONTROL
    WS -->|WebSocket| SIM
    WS -->|WebSocket| EMU
    WS -->|WebSocket| DEMO
    
    CDN -->|HTTP/JS| CLIENT
    CDN -->|HTTP/JS| CONTROL
    CDN -->|HTTP/JS| SIM
    CDN -->|HTTP/JS| EMU
    CDN -->|HTTP/JS| DEMO
```

## Core Components

### 1. Device Layer
- **Physical Devices**: ESP32-C3 microcontrollers with sensors (IMU, LEDs, vibration motor)
- **BLE Beacons**: Position reference beacons for spatial awareness
- **Firmware**: Modular process-based architecture with command registry

### 2. Communication Layer
- **WebSocket Server**: Central hub for device and client communication
- **CDN Server**: Serves shared JavaScript libraries and firmware files
- **Command Protocol**: ASCII-hex format for device commands and responses

### 3. Application Layer
- **Client Applications**: Web-based UIs for device monitoring and control
- **Simulation Tools**: Virtual devices for development and testing
- **Demo Applications**: Interactive p5.js scenes for visualization

## Data Flow

```mermaid
sequenceDiagram
    participant Device as Physical Device
    participant Server as WebSocket Server
    participant Client as Client Application
    participant CDN as CDN Server
    
    Note over Device,CDN: Device Registration & Data Streaming
    Device->>Server: Connect & Register (device_id)
    Server->>Client: Broadcast device connection
    
    loop Continuous Data Stream
        Device->>Server: Sensor data (IMU, BLE RSSI)
        Server->>Client: Forward sensor data
        Client->>CDN: Load shared libraries
        CDN-->>Client: Return JS libraries
    end
    
    Note over Device,CDN: Command Execution
    Client->>Server: Send command (led:vibrate:etc)
    Server->>Device: Route command to device
    Device->>Device: Execute command
    Device->>Server: Command result/status
    Server->>Client: Forward result
```

## Service Dependencies

```mermaid
graph LR
    subgraph "Core Services"
        WS[WebSocket Server]
        CDN[CDN Server]
    end
    
    subgraph "Client Services"
        CLIENT[Client UI]
        CONTROL[Device Control]
        SIM[Simulator]
        EMU[Emulator]
    end
    
    subgraph "Development"
        DOCS[Documentation]
    end
    
    WS -.->|Commands JSON| CDN
    CLIENT -->|WebSocket| WS
    CLIENT -->|JS Libraries| CDN
    CONTROL -->|WebSocket| WS
    CONTROL -->|JS Libraries| CDN
    SIM -->|WebSocket| WS
    SIM -->|JS Libraries| CDN
    EMU -->|WebSocket| WS
    EMU -->|JS Libraries| CDN
```

## Key Design Principles

1. **Modularity**: Each service is independently deployable and configurable
2. **Real-time Communication**: WebSocket-based for low-latency device interaction
3. **Shared Libraries**: Common device abstractions via CDN for consistency
4. **Development Support**: Simulators and emulators for hardware-free development
5. **Extensibility**: Plugin-based firmware architecture with command registry

## Technology Stack

- **Backend**: Python Flask with WebSockets
- **Frontend**: HTML5, JavaScript, p5.js
- **Firmware**: Arduino/ESP32 with PlatformIO
- **Containerization**: Docker & Docker Compose
- **Documentation**: MkDocs with Material theme
- **Communication**: WebSocket protocol with ASCII-hex encoding
