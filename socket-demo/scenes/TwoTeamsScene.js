// socket-demo/scenes/TwoTeamsScene.js
class TwoTeamsScene extends Scene {
  constructor(...a) {
    super(...a);
    this.deviceRadius = 40;
    this._devState = new Map();
    this._teamById = new Map();
    this._lastLedHex = new Map();
    this.colors = {
      blue: { rgb: [0, 0, 255], hex: "0000ff" },
      red: { rgb: [255, 0, 0], hex: "ff0000" },
    };
  }
  setup() {}

  _assignTeamsEqual(devs) {
    const ids = devs.map((d) => d.id ?? d.getId?.() ?? d);
    const sorted = [...ids].sort((a, b) => String(a).localeCompare(String(b)));
    const n = sorted.length;
    const blueCount = Math.floor(n / 2); // equal split when even; for odd, red gets one extra
    const blueSet = new Set(sorted.slice(0, blueCount));
    for (const id of ids)
      this._teamById.set(id, blueSet.has(id) ? "blue" : "red");
  }

  _teamFor(id) {
    let h = 0;
    const s = String(id ?? "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (h & 1) === 0 ? "blue" : "red";
  }
  _updateDevice(k) {
    let p = this._devState.get(k);
    if (!p) {
      p = { x: random(60, width - 60), y: random(60, height - 60) };
      this._devState.set(k, p);
    }
    return p;
  }
  draw() {
    background(0);
    const devs = [...this.deviceManager.getAllDevices().values()];
    this._assignTeamsEqual(devs);
    noStroke();
    for (const dev of devs) {
      const key = dev.id ?? dev.getId?.() ?? dev;
      const p = this._updateDevice(key);
      const team = this._teamById.get(key) || "blue";
      const col = this.colors[team];

      // Update device LED if color changed (or first time)
      const wantHex = col.hex.toLowerCase();
      const prevHex = this._lastLedHex.get(key);
      if (wantHex !== prevHex && this.deviceManager?.sendCommandToDevice) {
        try {
          this.deviceManager.sendCommandToDevice(key, "pattern", "solid");
          this.deviceManager.sendCommandToDevice(key, "led", wantHex);
        } catch (_) {}
        this._lastLedHex.set(key, wantHex);
      }

      if (window.DeviceCircle) {
        window.DeviceCircle.draw(p.x, p.y, this.deviceRadius, {
          fillBody: col.rgb,
          fillEye: [0, 0, 0, 0],
          fillPupil: [0],
        });
      } else {
        // fallback if DeviceCircle isn't loaded
        noStroke();
        fill(...col.rgb);
        ellipse(p.x, p.y, this.deviceRadius * 2);
        fill(0);
        ellipse(p.x - 16, p.y - 10, 12, 12);
        ellipse(p.x + 16, p.y - 10, 12, 12);
      }
    }
    // prune missing ids
    const present = new Set(devs.map((d) => d.id ?? d.getId?.() ?? d));
    for (const id of [...this._teamById.keys()])
      if (!present.has(id)) this._teamById.delete(id);
    for (const id of [...this._lastLedHex.keys()])
      if (!present.has(id)) this._lastLedHex.delete(id);
    fill(255);
    noStroke();
    text(
      `Devices: ${this.deviceManager.getDeviceCount?.() ?? devs.length}`,
      10,
      20
    );
  }
}
