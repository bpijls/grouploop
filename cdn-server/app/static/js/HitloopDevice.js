/**
 * HitloopDevice class represents a single hitloop device
 * It holds a reference to the websocket and contains methods to parse HEX data
 */
class HitloopDevice {
    constructor(id, color = [255, 255, 255], motorState = false) {
        this.id = id;
        this.color = color;
        this.motorState = motorState;
        this.ws = null;

        // Parsed sensor values
        this.ax = 0;
        this.ay = 0;
        this.az = 0;
        this.dNW = 0; // North-West distance (top-left)
        this.dNE = 0; // North-East distance (top-right)
        this.dSW = 0; // South-West distance (bottom-left)
        this.dSE = 0; // South-East distance (bottom-right)
        this.tap = false; // Tap detection state
    }

    /**
     * Parse HEX string received from socket server
     * Format: idHex(4) + ax(2) + ay(2) + az(2) + dTL(2) + dTR(2) + dBR(2) + dBL(2) + tap(2)
     * @param {string} hexString - The HEX string to parse
     */
    parseHexData(hexString) {
        // Remove any whitespace and newlines, normalize case
        const raw = String(hexString || '').trim();
        // Expect at least 20 hex chars (id 4 + 8 bytes * 2)
        if (raw.length < 20) {
            return false;
        }
        // Consider only first 20 chars in case of trailing data/newline
        const cleanHex = raw.slice(0, 20);
        // Validate hex charset
        if (!/^[0-9a-fA-F]{20}$/.test(cleanHex)) {
            return false;
        }

        try {
            // Parse the HEX string
            const idHex = cleanHex.substring(0, 4);
            const axHex = cleanHex.substring(4, 6);
            const ayHex = cleanHex.substring(6, 8);
            const azHex = cleanHex.substring(8, 10);
            const dTLHex = cleanHex.substring(10, 12); // dNW (North-West)
            const dTRHex = cleanHex.substring(12, 14); // dNE (North-East)
            const dBRHex = cleanHex.substring(14, 16); // dSE (South-East)
            const dBLHex = cleanHex.substring(16, 18); // dSW (South-West)
            const tapHex = cleanHex.substring(18, 20); // Tap detection

            // Convert HEX to decimal values
            const ax = parseInt(axHex, 16);
            const ay = parseInt(ayHex, 16);
            const az = parseInt(azHex, 16);
            const dNW = parseInt(dTLHex, 16); // Top-left -> North-West
            const dNE = parseInt(dTRHex, 16); // Top-right -> North-East
            const dSE = parseInt(dBRHex, 16); // Bottom-right -> South-East
            const dSW = parseInt(dBLHex, 16); // Bottom-left -> South-West
            const tapValue = parseInt(tapHex, 16); // Tap detection value

            // Validate parsed numbers are finite
            if ([ax, ay, az, dNW, dNE, dSE, dSW, tapValue].some(n => !Number.isFinite(n))) {
                return false;
            }

            this.ax = ax;
            this.ay = ay;
            this.az = az;
            this.dNW = dNW;
            this.dNE = dNE;
            this.dSE = dSE;
            this.dSW = dSW;
            this.tap = tapValue === 255; // Convert to boolean: 255 = true, 0 = false
            return true;
        } catch (_e) {
            return false;
        }
    }

    /**
     * Set the WebSocket reference
     * @param {WebSocket} websocket - The WebSocket instance
     */
    setWebSocket(websocket) {
        this.ws = websocket;
    }

    /**
     * Get current sensor data as an object
     * @returns {Object} Object containing all sensor values
     */
    getSensorData() {
        return {
            id: this.id,
            ax: this.ax,
            ay: this.ay,
            az: this.az,
            dNW: this.dNW,
            dNE: this.dNE,
            dSW: this.dSW,
            dSE: this.dSE,
            tap: this.tap,
            color: this.color,
            motorState: this.motorState
        };
    }
}


