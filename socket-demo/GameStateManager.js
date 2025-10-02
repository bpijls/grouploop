class GameStateManager {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
        this.states = new Map(); // key -> GameState instance
        this.currentKey = null;
    }

    addState(key, stateInstance) {
        this.states.set(key, stateInstance);
    }

    switchTo(key) {
        const next = this.states.get(key);
        if (!next) return false;
        this.currentKey = key;
        if (typeof next.setup === 'function') next.setup();
        return true;
    }

    draw() {
        if (!this.currentKey) return;
        const state = this.states.get(this.currentKey);
        if (state && typeof state.draw === 'function') state.draw();
    }

    getOrderedKeys() {
        return Array.from(this.states.keys());
    }

    getCurrentIndex() {
        const keys = this.getOrderedKeys();
        if (!this.currentKey) return -1;
        return keys.indexOf(this.currentKey);
    }

    nextState() {
        const keys = this.getOrderedKeys();
        if (keys.length === 0) return false;
        const idx = this.getCurrentIndex();
        if (idx < 0) {
            // If none selected yet, go to first
            return this.switchTo(keys[0]);
        }
        if (idx >= keys.length - 1) {
            // At last, stop
            return false;
        }
        return this.switchTo(keys[idx + 1]);
    }

    previousState() {
        const keys = this.getOrderedKeys();
        if (keys.length === 0) return false;
        const idx = this.getCurrentIndex();
        if (idx <= 0) {
            // At first or none selected, stop
            return false;
        }
        return this.switchTo(keys[idx - 1]);
    }
}


