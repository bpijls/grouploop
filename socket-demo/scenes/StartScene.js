// Minimal sound loader that works with or without p5.sound
function _safeLoadSound(path, onLoad) {
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.loadSound === "function"
      ) {
        // p5.sound is present – use it
        return window.loadSound(path, onLoad);
      }
    } catch (_) {}
    // Fallback: HTMLAudioElement shim with a tiny p5-like API we use later
    const audio = new Audio(path);
    // ensure callbacks fire once it's ready enough to play
    const ready = () => {
      if (onLoad) onLoad();
    };
    audio.addEventListener("canplaythrough", ready, { once: true });
    // p5-like helpers used in the scene
    audio.isLoaded = () => true;
    audio.isPlaying = () => !audio.paused;
    audio.setLoop = (b) => {
      audio.loop = !!b;
    };
    audio.setVolume = (v) => {
      audio.volume = Math.max(0, Math.min(1, v ?? 1));
    };
    audio.loop = () => {
      audio.play().catch(() => {});
    };
    return audio;
  }
  class StartScene extends Scene {
    constructor(...a) {
      super(...a);
      this.deviceRadius = 40;           // visual size of each device circle
      this._devState = new Map();       // per-device x/y/vx/vy state
    }
  
    setup() {}
  
    _normAccel(v) {
      if (v == null) return 0;
      if (v >= -1.5 && v <= 1.5) return constrain(v, -1, 1);
      if (v >= -20 && v <= 20) return constrain(v / 9.81, -1, 1);
      if (v >= 0 && v <= 255) return constrain((v - 127.5) / 127.5, -1, 1);
      return constrain(v, -1, 1);
    }
  
    _updateDevice(devKey, d = {}) {
      let p = this._devState.get(devKey);
      if (!p) {
        p = { x: random(60, width - 60), y: random(60, height - 60), vx: 0, vy: 0 };
        this._devState.set(devKey, p);
      }
  
      // Simple motion: accelerometer → velocity (kept smooth, no magnets/ripples)
      const ax = this._normAccel(d.ax ?? d.aX ?? d.accX);
      const ay = this._normAccel(d.ay ?? d.aY ?? d.accY);
      const az = this._normAccel(d.az ?? d.aZ ?? d.accZ);
  
      p.vx += ay * 0.6;   // horizontal
      p.vy += -ax * 0.6;  // vertical
  
      const maxS = 3;
      p.vx = Math.max(-maxS, Math.min(maxS, p.vx));
      p.vy = Math.max(-maxS, Math.min(maxS, p.vy));
  
      p.x += p.vx;
      p.y += p.vy;
  
      const R = this.deviceRadius;
      p.x = constrain(p.x, R, width - R);
      p.y = constrain(p.y, R, height - R);
  
      // keep az for eye offset magnitude
      return { ...p, az };
    }
  
    draw() {
      background(0);
  
      const dm = this.deviceManager;
      const devs = [...dm.getAllDevices().values()];
  
      noStroke();
      for (const dev of devs) {
        const d = dev.getSensorData?.() ?? {};
        const key = dev.id ?? dev.getId?.() ?? dev;
        const p = this._updateDevice(key, d);
  
        // Body
        fill(255);
        ellipse(p.x, p.y, this.deviceRadius * 2);
  
        // Eyes (kept for basic feedback)
        const exOff = 16, eyOff = 10;
        const ax = this._normAccel(d.ax ?? d.aX ?? d.accX);
        const ay = this._normAccel(d.ay ?? d.aY ?? d.accY);
        const m = 12 * (1 + 0.15 * (p.az ?? 0));
        const ex = ay * m;    // ay>0 → right
        const ey = -ax * m;   // ax>0 → up
  
        fill(255);
        ellipse(p.x - exOff, p.y - eyOff, 32, 32);
        ellipse(p.x + exOff, p.y - eyOff, 32, 32);
        fill(0);
        ellipse(p.x - exOff + ex, p.y - eyOff + ey, 12, 12);
        ellipse(p.x + exOff + ex, p.y - eyOff + ey, 12, 12);
      }
  
      // HUD
      fill(255);
      noStroke();
      text(`Devices: ${dm.getDeviceCount?.() ?? devs.length}`, 10, 20);
    }
  }