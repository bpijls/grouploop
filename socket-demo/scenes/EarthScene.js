class EarthScene extends Scene {
  constructor(...a) {
    super(...a);
    this.dotSize = 4;
    this.targets = [];
    this.parts = [];
    this.play = false;
    this._k1 = false;
    this.mode = "default";
    this.t = 0;
    this.obstacles = [];
    // --- Step 1: magnets (left & right centers)
    this.magnets = []; // [{x,y},{x,y}]
    this.magnetR = 16; // visual radius for debug
    this.showMagnets = false; // draw faint markers (can toggle later)
    // Simplified magnet + random walk system for circles
    this._devState = new Map();
    this.magnetStrength = 0.01; // pull strength
    this.jitterStrength = 1.5; // random walk range
    this.deviceRadius = 40; // collision body radius for device circles
    this.collisionIterations = 4; // how many relaxation passes per frame
    this.magnetDampenFactor = 0.9; // 0..1, how strongly movement reduces magnet pull

    // WanderingAttractors-style motion params
    this.params = {
      maxSpeed: 2.0,
      maxForce: 0.08,
      wanderJitter: 0.05,
      baseAttraction: 0.16,
      edgePadding: 40,
      verticalGain: 3.0,
      verticalDeadzone: 0.05,
      horizontalGain: 3.0,
      horizontalDeadzone: 0.05,
    };
    this.ripples = [];
    // --- Big Hub Circle (will be sized in setup when width/height are ready)
    this.hub = {
      cx: 0,
      cy: 0,
      baseR: 80,
      r: 80,
      targetR: 80,
      maxR: 200,
      growPerTap: 12,
      state: "idle",
      eatTimer: 0,
    };
    this.tapLog = new Map(); // devKey -> last tap ms
    this.allTapWindow = 800; // ms for “everyone taps together”
    this.fling = []; // thrown device circles after eat
  }

  setup() {
    const pg = createGraphics(width, height);
    pg.pixelDensity(1);
    pg.background(255);
    pg.fill(0);
    pg.textAlign(CENTER, CENTER);
    pg.textStyle(BOLD);
    const fs = min(width, height) * 0.18;
    pg.textSize(fs);
    pg.text("Welcome", width / 2, height * 0.38);
    pg.text("to Hitloop", width / 2, height * 0.55);
    pg.loadPixels();

    const m = 40,
      g = 8,
      stepX = g,
      stepY = g * 0.866025403784;
    for (let y = m, row = 0; y < height - m; y += stepY, row++) {
      const xo = (row & 1) * (stepX * 0.5);
      for (let x = m + xo; x < width - m; x += stepX) {
        const i = 4 * (int(y) * width + int(x));
        if ((pg.pixels[i] + pg.pixels[i + 1] + pg.pixels[i + 2]) / 3 < 200)
          this.targets.push({ x, y });
      }
    }
    pg.remove();

    this.parts = this.targets.map((t) => ({
      x: random(width),
      y: random(height),
      tx: t.x,
      ty: t.y,
      vx: 0,
      vy: 0,
      dispersing: false,
      done: false,
    }));

    // (cover dot image loading and grid initialization removed)

    this._updateMagnets();

    // Initialize hub sizes with real canvas dimensions
    const minDim = Math.min(width, height);
    this.hub.cx = width / 2;
    this.hub.cy = height / 2;
    this.hub.baseR = minDim * 0.14;
    this.hub.r = this.hub.baseR;
    this.hub.targetR = this.hub.baseR;
    this.hub.maxR = minDim * 0.48;
    this.hub.growPerTap = minDim * 0.012;
  }

  _startWord() {
    for (const p of this.parts) {
      p.x = random(width);
      p.y = random(height);
      p.vx = p.vy = 0;
      p.dispersing = false;
      p.done = false;
    }
    this.play = true;
    this.mode = "text";
  }

  _clearWord() {
    for (const p of this.parts) {
      p.done = true;
      p.dispersing = false;
    }
    this.mode = "default";
  }

  // Compute magnet positions for current canvas size
  _updateMagnets() {
    this.magnets = [
      { x: 0 + this.magnetR, y: height * 0.5 }, // left edge middle
      { x: width - this.magnetR, y: height * 0.5 }, // right edge middle
    ];
  }


  // (Debug) draw magnets so we can see them while building
  _drawMagnets() {
    if (!this.showMagnets) return;
    push();
    noFill();
    stroke(255, 90);
    strokeWeight(2);
    for (const m of this.magnets) {
      circle(m.x, m.y, this.magnetR * 2);
      // crosshair
      line(m.x - this.magnetR * 0.7, m.y, m.x + this.magnetR * 0.7, m.y);
      line(m.x, m.y - this.magnetR * 0.7, m.x, m.y + this.magnetR * 0.7);
    }
    pop();
  }

  _beginEatAndFling(devPositions) {
    this.fling.length = 0;
    const cx = this.hub.cx,
      cy = this.hub.cy;
    for (const p of devPositions) {
      const dx = p.x - cx,
        dy = p.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist,
        ny = dy / dist;
      const speed = 10 + Math.random() * 8;
      this.fling.push({
        x: p.x,
        y: p.y,
        vx: nx * speed,
        vy: ny * speed,
        life: 45,
      });
    }
    this.hub.state = "fling";
    this.hub.r = this.hub.maxR * 0.8; // just after “eat”
    this.hub.targetR = 0; // then disappear
  }
  // Wandering + left/right attraction (WanderingAttractors-style), circles only
  _wanderAndAttract(devKey, sensor) {
    let p = this._devState.get(devKey);
    if (!p) {
      p = {
        x: random(60, width - 60),
        y: random(60, height - 60),
        vx: random(-1, 1),
        vy: random(-1, 1),
      };
      this._devState.set(devKey, p);
    }

    // --- Wander: small random steering force
    const jitter = this.params.wanderJitter;
    // remove horizontal wander; vertical is sensor-driven
    // (no random added to vx/vy)

    // --- Movement-based damping from accel
    const ax = this._normAccel(sensor.ax ?? sensor.aX ?? sensor.accX);
    const ay = this._normAccel(sensor.ay ?? sensor.aY ?? sensor.accY);
    const az = this._normAccel(sensor.az ?? sensor.aZ ?? sensor.accZ);
    // Horizontal movement: use ay only (ay>0 -> right, ay<0 -> left)
    const hCombo = ay;
    const hDead = this.params.horizontalDeadzone ?? 0.05;
    if (Math.abs(hCombo) > hDead) {
      p.vx += hCombo * (this.params.horizontalGain ?? 3.0);
    }
    // --- Vertical movement: use ax only
    // ax > 0 -> move up (negative vy); ax < 0 -> move down
    const combo = ax; // direct use of ax
    const dead = this.params.verticalDeadzone ?? 0.05;
    if (Math.abs(combo) > dead) {
      p.vy += -combo * (this.params.verticalGain ?? 3.0);
    }

    // --- Limit velocity per-axis (keep horizontal independent of vertical)
    const maxS = this.params.maxSpeed;
    p.vx = Math.max(-maxS, Math.min(maxS, p.vx));
    p.vy = Math.max(-maxS, Math.min(maxS, p.vy));

    p.x += p.vx;
    p.y += p.vy;

    // Keep inside bounds (accounting for circle radius)
    const pad = this.deviceRadius;
    p.x = constrain(p.x, pad, width - pad);
    p.y = constrain(p.y, pad, height - pad);

    return { x: p.x, y: p.y };
  }

  _drawWord() {
    if (this.mode !== "text") return;
    noStroke();
    fill(255);
    let moving = false;
    for (const p of this.parts) {
      if (this.play) {
        p.x += (p.tx - p.x) / 30;
        p.y += (p.ty - p.y) / 30;
      }
      if (abs(p.tx - p.x) > 0.15 || abs(p.ty - p.y) > 0.15) moving = true;
      circle(p.x, p.y, this.dotSize);
    }
    if (this.play && !moving) this.play = false;
  }

  _normAccel(v) {
    if (v == null) return 0;
    if (v >= -1.5 && v <= 1.5) return constrain(v, -1, 1);
    if (v >= -20 && v <= 20) return constrain(v / 9.81, -1, 1);
    if (v >= 0 && v <= 255) return constrain((v - 127.5) / 127.5, -1, 1);
    return constrain(v, -1, 1);
  }

  draw() {
    background(0);
    if (!this.hub || !isFinite(this.hub.baseR) || this.hub.baseR <= 0) {
      const minDim = Math.min(width, height);
      this.hub = {
        cx: width / 2,
        cy: height / 2,
        baseR: minDim * 0.14,
        r: minDim * 0.14,
        targetR: minDim * 0.14,
        maxR: minDim * 0.48,
        growPerTap: minDim * 0.012,
        state: "idle",
        eatTimer: 0,
      };
    }
    this.hub.cx = width / 2;
    this.hub.cy = height / 2;

    const k1 = keyIsDown(49);
    if (k1 && !this._k1) {
      this.mode === "default" ? this._startWord() : this._clearWord();
    }
    this._k1 = k1;

    // const dm = this.deviceManager,
    //   count = dm.getDeviceCount();
    // const devs = [...dm.getAllDevices().values()],
    //   devPositions = [];
    const dm = this.deviceManager,
      count = dm.getDeviceCount();
    const devs = [...dm.getAllDevices().values()],
      devPositions = [];
    for (const dev of devs) {
      const d = dev.getSensorData();
      const key = dev.id ?? dev.getId?.() ?? dev;
      // No movement here; positions will be set around the hub circle below
      devPositions.push({ key, d });
    }

    // --- Place devices around the big hub circle ---
    const n = devPositions.length;
    const cx = this.hub.cx, cy = this.hub.cy;
    const ringR = this.hub.r + this.deviceRadius + 18;
    if (n > 0) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TWO_PI;
        devPositions[i].x = cx + Math.cos(a) * ringR;
        devPositions[i].y = cy + Math.sin(a) * ringR;
      }
    }

    // --- Taps: grow hub per tap and detect "everyone taps together" ---
    const now = millis();
    let allTapped = n > 0;
    for (const item of devPositions) {
      const { key, d, x, y } = item;
      if (d && d.tap && !d._tapHandled) {
        // record tap for together-detection
        this.tapLog.set(key, now);
        // grow hub a little
        this.hub.targetR = Math.min(this.hub.maxR, this.hub.targetR + this.hub.growPerTap);
        // spawn a visual ripple at the device
        this.ripples.push({
          x,
          y,
          r: this.deviceRadius,
          maxR: Math.min(0.22 * Math.min(width, height), 200),
          influenceMax: Math.min(0.18 * Math.min(width, height), 160),
          band: 10,
          speed: 7,
          strength: 50,
          impulseCap: 3.5,
          alpha: 255,
          colR: 220,
          colG: 220,
          colB: 255,
        });
        d._tapHandled = true;
      } else if (d && !d.tap) {
        d._tapHandled = false;
      }
      const t = this.tapLog.get(key) || -1;
      if (now - t > this.allTapWindow) allTapped = false;
    }
    if (allTapped && n > 0 && (this.hub.state === 'idle' || this.hub.state === 'growing')) {
      this.hub.state = 'eating';
      this.hub.eatTimer = 0;
    }

    // --- Animate hub state & draw hub ---
    if (this.hub.state === 'idle' || this.hub.state === 'growing') {
      this.hub.r += (this.hub.targetR - this.hub.r) * 0.15;
      this.hub.state = Math.abs(this.hub.targetR - this.hub.r) > 0.5 ? 'growing' : 'idle';
    } else if (this.hub.state === 'eating') {
      this.hub.r += (this.hub.maxR - this.hub.r) * 0.25;
      this.hub.eatTimer += 1;
      if (this.hub.eatTimer > 18) {
        this._beginEatAndFling(devPositions);
        this.tapLog.clear();
      }
    } else if (this.hub.state === 'fling') {
      for (let i = this.fling.length - 1; i >= 0; i--) {
        const f = this.fling[i];
        f.vx *= 0.985; f.vy *= 0.985;
        f.x += f.vx; f.y += f.vy;
        f.life -= 1;
        if (f.life <= 0) this.fling.splice(i, 1);
      }
      this.hub.r += (0 - this.hub.r) * 0.2;
      if (this.fling.length === 0 && this.hub.r < 1) {
        this.hub.r = this.hub.baseR;
        this.hub.targetR = this.hub.baseR;
        this.hub.state = 'idle';
      }
    }

    noStroke();
    fill(255, 60, 60, 220);
    circle(cx, cy, this.hub.r * 2);

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const w = this.ripples[i];
      push();
      blendMode(ADD);
      // soft outer glows
      noStroke();
      fill(255, 60, 40, 18);
      ellipse(w.x, w.y, (w.r + 18) * 2, (w.r + 18) * 2);
      fill(255, 80, 50, 24);
      ellipse(w.x, w.y, (w.r + 10) * 2, (w.r + 10) * 2);
      // hot rings
      noFill();
      stroke(255, 90, 60, 140); // main hot ring
      strokeWeight(4);
      ellipse(w.x, w.y, w.r * 2, w.r * 2);
      stroke(255, 40, 30, 90); // inner ring
      strokeWeight(2);
      if (w.r - 12 > 0) ellipse(w.x, w.y, (w.r - 12) * 2, (w.r - 12) * 2);
      stroke(255, 120, 80, 80); // outer ring
      strokeWeight(2);
      ellipse(w.x, w.y, (w.r + 12) * 2, (w.r + 12) * 2);
      pop();
      // evolve & cull
      w.r += w.speed;
      if (w.r > w.maxR || w.alpha <= 0) this.ripples.splice(i, 1);
    }

    // (star color mode and star drawing removed)
    this._drawWord();

    // Keep background solid black; no image/gradient

    fill(255);
    noStroke();
    text(`Devices: ${count}`, 10, 20);

    for (const { x, y, d } of devPositions) {
      noStroke();
      fill(255);
      ellipse(x, y, this.deviceRadius * 2);
      const ax = this._normAccel(d.ax ?? d.aX ?? d.accX);
      const ay = this._normAccel(d.ay ?? d.aY ?? d.accY);
      const az = this._normAccel(d.az ?? d.aZ ?? d.accZ);
      const m = 12 * (1 + 0.15 * az);
      const ex = ay * m;   // ay>0 -> right, ay<0 -> left
      const ey = -ax * m;  // ax>0 -> up, ax<0 -> down
      fill(255);
      ellipse(x - 16, y - 10, 32, 32);
      ellipse(x + 16, y - 10, 32, 32);
      fill(0);
      ellipse(x - 16 + ex, y - 10 + ey, 12, 12);
      ellipse(x + 16 + ex, y - 10 + ey, 12, 12);
    }

    if (this.hub.state === 'fling' && this.fling.length) {
      noStroke();
      fill(255);
      for (const f of this.fling) ellipse(f.x, f.y, this.deviceRadius * 2);
    }
  }
}
