/**
 * HitloopDeviceManager class represents a collection of hitloop devices
 * It manages multiple devices and handles WebSocket communication
 */
class HitloopDeviceManager {
    constructor(websocketUrl) {
        this.ws = null;
        this.websocketUrl = websocketUrl;
        this.devices = new Map(); // Key-value pairs: deviceId -> HitloopDevice
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        this.ws = new WebSocket(this.websocketUrl);

        this.ws.addEventListener('open', (event) => {
            // Send 's' to start receiving data
            this.ws.send('s');
        });

        this.ws.addEventListener('message', (event) => {
            this.handleMessage(event.data);            
        });

        this.ws.addEventListener('close', (event) => {
        });

        this.ws.addEventListener('error', (error) => {
        });
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Handle incoming WebSocket messages
     * @param {string} data - The received data
     */
    handleMessage(data) {
        // Support batched frames separated by newlines
        const text = String(data || '');
        const frames = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
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
        // Require at least 18 hex chars and valid charset before doing anything
        if (raw.length < 18) return false;
        const frame = raw.slice(0, 18);
        if (!/^[0-9a-fA-F]{18}$/.test(frame)) return false;

        // Extract device ID from first 4 hex characters
        const deviceIdHex = frame.substring(0, 4).toLowerCase();

        // If device exists, update it; otherwise validate fully before creating
        let device = this.devices.get(deviceIdHex);
        if (device) {
            return device.parseHexData(frame);
        }

        // Validate by attempting to parse with a temporary instance
        const temp = new HitloopDevice(deviceIdHex);
        const ok = temp.parseHexData(frame);
        if (!ok) return false;

        // Only now add the device
        device = new HitloopDevice(deviceIdHex);
        device.setWebSocket(this.ws);
        this.devices.set(deviceIdHex, device);
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
    }

    /**
     * Remove a device from the manager
     * @param {number} deviceId - The ID of the device to remove
     */
    removeDevice(deviceId) {
        const key = String(deviceId).slice(0, 4).toLowerCase();
        this.devices.delete(key);
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
}


