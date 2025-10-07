class PartialPhysicsWithGlow extends GameState {
  constructor(...a) {
    super(...a);
    this.dotSize = 4;
    this.targets = [];
    this.parts = [];
    this.play = false;
    this._k1 = false;
    this.mode = "default";
    this.t = 0;
    this.stars = [];
    this.starCap = 0;
    this.starLayer = null;
    this.obstacles = [];
    this._grid = null;
    this._cell = 48;
    this.bgSound = null;
    this._audioStarted = false;
    this.bgVol = 0.4;
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

    this.starLayer = createGraphics(width, height);
    this.starLayer.pixelDensity(1);
    this.starCap = width * 9;
    this.stars = new Array(this.starCap);

    // Load background sound (requires p5.sound)
    
      this.bgSound = loadSound("./sounds/rain.mp3", () => {
        this.bgSound.setLoop(true);
        this.bgSound.setVolume(this.bgVol);
        this._startBg();
      });
    
  }

  _resetStars() {
    this.t = 0;
    this.stars.fill(undefined);
    this.starLayer.clear();
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

  _startBg(){
    // Try to start immediately
    try{
      if (typeof getAudioContext === 'function') {
        const ctx = getAudioContext();
        if (ctx && ctx.state !== 'running') ctx.resume().catch(()=>{});
      }
    }catch(_){/* no-op */}
    try{
      if (this.bgSound && this.bgSound.isLoaded() && !this.bgSound.isPlaying()) {
        this.bgSound.loop();
        this.bgSound.setVolume(this.bgVol);
      }
    }catch(_){/* no-op */}

    // Also start on ANY user action (not tied to key '1')
    const startOnce = () => {
      if (typeof userStartAudio === 'function') userStartAudio();
      try{
        if (this.bgSound && this.bgSound.isLoaded() && !this.bgSound.isPlaying()){
          this.bgSound.loop();
          this.bgSound.setVolume(this.bgVol);
        }
      }catch(_){/* no-op */}
      window.removeEventListener('pointerdown', startOnce);
      window.removeEventListener('touchstart', startOnce);
      window.removeEventListener('keydown', startOnce);
    };
    window.addEventListener('pointerdown', startOnce, {once:true});
    window.addEventListener('touchstart', startOnce, {once:true});
    window.addEventListener('keydown', startOnce, {once:true});
  }

  _buildObstacleGrid() {
    const cell = this._cell,
      g = new Map();
    for (const o of this.obstacles) {
      const minCx = Math.floor((o.x - o.r) / cell),
        maxCx = Math.floor((o.x + o.r) / cell);
      const minCy = Math.floor((o.y - o.r) / cell),
        maxCy = Math.floor((o.y + o.r) / cell);
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          const key = cx + "," + cy;
          let arr = g.get(key);
          if (!arr) {
            arr = [];
            g.set(key, arr);
          }
          arr.push(o);
        }
      }
    }
    this._grid = g;
  }

  _forEachNearbyOb(x, y, cb) {
    const cell = this._cell;
    const cx = Math.floor(x / cell),
      cy = Math.floor(y / cell);
    if (!this._grid) {
      for (const o of this.obstacles) {
        if (cb(o)) break;
      }
      return;
    }
    for (let iy = -1; iy <= 1; iy++) {
      for (let ix = -1; ix <= 1; ix++) {
        const arr = this._grid.get(cx + ix + "," + (cy + iy));
        if (!arr) continue;
        for (const o of arr) {
          if (cb(o)) return;
        }
      }
    }
  }

  _spawnStars(n = 9) {
    for (let i = 0; i < n; i++) {
      const idx = this.t % this.starCap;
      this.stars[idx] = {
        x: (this.t * 99) % width,
        y: 0,
        vx: random(-0.6, 0.6),
        vy: 0.5,
        s: 3,
      };
      this.t++;
    }
  }

  _moveStar(p) {
    const N = noise(p.x / width, p.y / 9, this.t / width);
    N > 0.4
      ? (p.vy += 0.28)
      : ((p.vx += N % 0.1 > 0.05 ? 0.03 : -0.03), (p.vy += 0.02));
    p.vx = constrain(p.vx, -2, 2);
    p.vy = constrain(p.vy, -4, 4);
    let nx = p.x + p.vx,
      ny = p.y + p.vy;
    this._forEachNearbyOb(nx, ny, (o) => {
      const dx = nx - o.x,
        dy = ny - o.y,
        d = sqrt(dx * dx + dy * dy);
      if (d < o.r + 0.5) {
        const nX = dx / (d || 1),
          nY = dy / (d || 1),
          dot = p.vx * nX + p.vy * nY;
        nx = o.x + nX * (o.r + 0.5);
        ny = o.y + nY * (o.r + 0.5);
        p.vx -= 2 * dot * nX;
        p.vy -= 2 * dot * nY;
        p.vx *= 0.6;
        p.vy *= 0.6;
        return true; // stop after first collision
      }
      return false;
    });
    p.x = nx;
    p.y = ny;
    p.s *= 0.997;
  }

  _drawStars(colorMode = "white") {
    this._spawnStars(9);
    const L = this.starLayer;
    L.push();
    L.noFill();
    let tint, blur, bgAlpha;
    switch (colorMode) {
      case "green":
        tint = color(80, 255, 160);
        blur = 2;
        bgAlpha = 6;
        break;
      case "red":
        tint = color(255, 100, 100);
        blur = 2;
        bgAlpha = 6;
        break;
      case "yellow":
        tint = color(255, 230, 120);
        blur = 2;
        bgAlpha = 6;
        break;
      case "orange":
        tint = color(255, 170, 80);
        blur = 2;
        bgAlpha = 6;
        break;
      default:
        tint = color(255);
        blur = 1;
        bgAlpha = 9;
    }
    L.background(0, bgAlpha);
    L.filter(BLUR, blur);
    L.stroke(tint);
    for (const p of this.stars) {
      if (!p) continue;
      this._moveStar(p);
      L.strokeWeight(p.s);
      L.point(p.x, p.y);
    }
    L.pop();
    image(L, 0, 0);
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

    const k1 = keyIsDown(49);
    if (k1 && !this._k1) {
      this.mode === "default" ? this._startWord() : this._clearWord();
    }
    this._k1 = k1;

    this.obstacles.length = 0;
    const dm = this.deviceManager,
      count = dm.getDeviceCount();
    const devs = [...dm.getAllDevices().values()],
      devPositions = [];
    for (const dev of devs) {
      const d = dev.getSensorData(),
        toPx = (v) => ((255 - (v || 0)) / 255) * Math.hypot(width, height);
      const dNW = toPx(d.dNW),
        dNE = toPx(d.dNE),
        dSW = toPx(d.dSW);
      let x = (width * width - (dNE * dNE - dNW * dNW)) / (2 * width);
      let y = (height * height - (dSW * dSW - dNW * dNW)) / (2 * height);
      x = constrain(x, 40, width - 40);
      y = constrain(y, 40, height - 40);
      devPositions.push({ x, y, d });
      this.obstacles.push({ x, y, r: 40 });
    }

    if (this.mode === "text")
      for (const p of this.parts)
        this.obstacles.push({ x: p.x, y: p.y, r: this.dotSize * 0.6 });

    this._buildObstacleGrid();

    let colorMode = "white";
    if (devPositions.length) {
      const inQuad = (fx, fy) => devPositions.every((p) => fx(p.x) && fy(p.y));
      if (
        inQuad(
          (x) => x < width / 2,
          (y) => y < height / 2
        )
      )
        colorMode = "green";
      else if (
        inQuad(
          (x) => x > width / 2,
          (y) => y < height / 2
        )
      )
        colorMode = "red";
      else if (
        inQuad(
          (x) => x < width / 2,
          (y) => y > height / 2
        )
      )
        colorMode = "yellow";
      else if (
        inQuad(
          (x) => x > width / 2,
          (y) => y > height / 2
        )
      )
        colorMode = "orange";
    }

    this._drawStars(colorMode);
    this._drawWord();

    fill(255);
    noStroke();
    text(`Devices: ${count}`, 10, 20);

    for (const { x, y, d } of devPositions) {
      noStroke();
      fill(...d.color);
      ellipse(x, y, 80);
      const ax = this._normAccel(d.ax ?? d.aX ?? d.accX);
      const ay = this._normAccel(d.ay ?? d.aY ?? d.accY);
      const az = this._normAccel(d.az ?? d.aZ ?? d.accZ);
      const m = 12 * (1 + 0.15 * az),
        ex = ax * m,
        ey = -ay * m;
      fill(255);
      ellipse(x - 16, y - 10, 32, 32);
      ellipse(x + 16, y - 10, 32, 32);
      fill(0);
      ellipse(x - 16 + ex, y - 10 + ey, 12, 12);
      ellipse(x + 16 + ex, y - 10 + ey, 12, 12);
    }
  }
}
