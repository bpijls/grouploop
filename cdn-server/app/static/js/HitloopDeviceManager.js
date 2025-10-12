/**
 * HitloopDeviceManager class represents a collection of hitloop devices
 * It manages multiple devices and handles WebSocket communication
 */
class HitloopDeviceManager {
    constructor(websocketUrl) {
        this.ws = null;
        this.websocketUrl = websocketUrl;
        this.devices = new Map(); // Key-value pairs: deviceId -> HitloopDevice
        this.lastSeen = new Map(); // Key-value pairs: deviceId -> timestamp (ms)
        this.pruneInterval = null;
        this.inactiveTimeoutMs = 5000;
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        console.log(`[HitloopDeviceManager] Attempting to connect to: ${this.websocketUrl}`);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[HitloopDeviceManager] Already connected, skipping connection attempt');
            return;
        }

        console.log('[HitloopDeviceManager] Creating new WebSocket connection...');
        this.ws = new WebSocket(this.websocketUrl);

        this.ws.addEventListener('open', (event) => {
            console.log('[HitloopDeviceManager] WebSocket connection opened successfully');
            // Send 's' to start receiving data
            console.log('[HitloopDeviceManager] Sending start command: "s"');
            this.ws.send('s');
        });

        this.ws.addEventListener('message', (event) => {
            console.log(`[HitloopDeviceManager] Received message: ${event.data}`);
            this.handleMessage(event.data);            
        });

        this.ws.addEventListener('close', (event) => {
            console.log(`[HitloopDeviceManager] WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        });

        this.ws.addEventListener('error', (error) => {
            console.error('[HitloopDeviceManager] WebSocket error:', error);
        });

        // Start periodic pruning of inactive devices
        if (!this.pruneInterval) {
            console.log('[HitloopDeviceManager] Starting device pruning interval');
            this.pruneInterval = setInterval(() => {
                this.pruneInactive();
            }, 1000);
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        console.log('[HitloopDeviceManager] Disconnecting from WebSocket server');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            console.log('[HitloopDeviceManager] WebSocket connection closed');
        }
        if (this.pruneInterval) {
            clearInterval(this.pruneInterval);
            this.pruneInterval = null;
            console.log('[HitloopDeviceManager] Device pruning interval stopped');
        }
    }

    /**
     * Handle incoming WebSocket messages
     * @param {string} data - The received data
     */
    handleMessage(data) {
        console.log(`[HitloopDeviceManager] Processing message with ${data.length} characters`);
        // Support batched frames separated by newlines
        const text = String(data || '');
        const frames = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        console.log(`[HitloopDeviceManager] Split into ${frames.length} frames`);
        for (const frame of frames) {
            // Parse the HEX data and update the corresponding device
            this.parseAndUpdateDevice(frame);
        }
    }

    /**
     * Parse HEX data and update the corresponding device
     * @param {string} hexString - The HEX string to parse
     * @returns {boolean} True if parsing was successful
     */
    parseAndUpdateDevice(hexString) {
        const raw = String(hexString || '').trim();
        // Require at least 20 hex chars and valid charset before doing anything (including tap byte)
        if (raw.length < 20) return false;
        const frame = raw.slice(0, 20);
        if (!/^[0-9a-fA-F]{20}$/.test(frame)) return false;

        // Extract device ID from first 4 hex characters
        const deviceIdHex = frame.substring(0, 4).toLowerCase();

        // If device exists, update it; otherwise validate fully before creating
        let device = this.devices.get(deviceIdHex);
        if (device) {
            const ok = device.parseHexData(frame);
            if (ok) this.lastSeen.set(deviceIdHex, Date.now());
            return ok;
        }

        // Validate by attempting to parse with a temporary instance
        const temp = new HitloopDevice(deviceIdHex);
        const ok = temp.parseHexData(frame);
        if (!ok) return false;

        // Only now add the device
        device = new HitloopDevice(deviceIdHex);
        device.setWebSocket(this.ws);
        this.devices.set(deviceIdHex, device);
        this.lastSeen.set(deviceIdHex, Date.now());
        // Update with the validated frame
        return device.parseHexData(frame);
    }

    /**
     * Add a device to the manager
     * @param {HitloopDevice} device - The device to add
     */
    addDevice(device) {
        device.setWebSocket(this.ws);
        // Ensure id key is a 4-char hex string
        const key = String(device.id).slice(0, 4).toLowerCase();
        this.devices.set(key, device);
        this.lastSeen.set(key, Date.now());
    }

    /**
     * Remove a device from the manager
     * @param {number} deviceId - The ID of the device to remove
     */
    removeDevice(deviceId) {
        const key = String(deviceId).slice(0, 4).toLowerCase();
        this.devices.delete(key);
        this.lastSeen.delete(key);
    }

    /**
     * Get a device by ID
     * @param {number} deviceId - The device ID
     * @returns {HitloopDevice|null} The device or null if not found
     */
    getDevice(deviceId) {
        const key = String(deviceId).slice(0, 4).toLowerCase();
        return this.devices.get(key) || null;
    }

    /**
     * Get all devices
     * @returns {Map} Map of all devices
     */
    getAllDevices() {
        return this.devices;
    }

    /**
     * Get the number of devices
     * @returns {number} Number of devices
     */
    getDeviceCount() {
        return this.devices.size;
    }

    /**
     * Remove devices that have not updated within the timeout window
     */
    pruneInactive() {
        const now = Date.now();
        for (const [id, ts] of this.lastSeen.entries()) {
            if (now - ts > this.inactiveTimeoutMs) {
                this.devices.delete(id);
                this.lastSeen.delete(id);
            }
        }
    }
}


