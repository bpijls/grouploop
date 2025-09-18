let ws = null;
let isConnected = false;
let devices = {}; // deviceId -> {ax, ay, az, history: Array}
let deviceOrder = []; // stable order for rendering

function connect(url) {
  if (ws) {
    try { ws.close(); } catch (_) {}
    ws = null;
  }
  devices = {}; deviceOrder = [];

  ws = new WebSocket(url);
  ws.onopen = () => {
    isConnected = true;
    setStatus(`connected to ${url}`);
    // subscribe to stream
    ws.send('s');
  };
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data && typeof data === 'object' && 'device' in data && 'ax' in data && 'ay' in data && 'az' in data) {
        const id = String(data.device);
        if (!devices[id]) {
          devices[id] = { ax: 0, ay: 0, az: 0, history: [] };
          deviceOrder.push(id);
        }
        devices[id].ax = Number(data.ax);
        devices[id].ay = Number(data.ay);
        devices[id].az = Number(data.az);
        const mag = Math.max(0, Math.sqrt(data.ax*data.ax + data.ay*data.ay + data.az*data.az) - 1.0);
        const ts = performance.now();
        devices[id].history.push({ t: ts, m: mag });
        // keep last 10 seconds
        const cutoff = ts - 10000;
        while (devices[id].history.length && devices[id].history[0].t < cutoff) devices[id].history.shift();
      }
    } catch (_) {
      // ignore non-JSON
    }
  };
  ws.onclose = () => { isConnected = false; setStatus('disconnected'); };
  ws.onerror = () => { setStatus('error'); };
}

function setStatus(text) {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
}

function setup() {
  const container = document.getElementById('canvas-container');
  const canvas = createCanvas(window.innerWidth, window.innerHeight - 42);
  canvas.parent(container);

  const connectBtn = document.getElementById('connectBtn');
  const urlInput = document.getElementById('wsUrl');
  connectBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) connect(url);
  });
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight - 42);
}

function draw() {
  background(250);
  const padding = 16;
  const rowH = 120;
  const gap = 12;
  const totalH = deviceOrder.length * (rowH + gap);

  let y = padding;
  for (const id of deviceOrder) {
    drawDeviceRow(id, y, width - padding*2, rowH);
    y += rowH + gap;
  }

  // hint text
  if (!isConnected) {
    fill(120); noStroke(); textSize(14);
    text('Enter the WebSocket URL of the server (e.g., ws://localhost:5003/) and click Connect. Then ensure a viewer client has sent "s" to subscribe.', padding, height - padding);
  }
}

function drawDeviceRow(id, y, w, h) {
  const x = 16;
  // panel
  stroke(220); fill(255);
  rect(x, y, w, h, 8);

  // header
  fill(30); noStroke(); textSize(16);
  text(id, x + 12, y + 22);

  const d = devices[id];
  // XYZ bars
  const barW = 24; const barGap = 12; const scale = 100; // 1g -> 100px
  const originY = y + h - 16;
  const baseX = x + 12;
  const comps = [
    { label: 'ax', val: d.ax, color: color(239, 68, 68) },
    { label: 'ay', val: d.ay, color: color(34, 197, 94) },
    { label: 'az', val: d.az, color: color(59, 130, 246) },
  ];
  let bx = baseX;
  for (const c of comps) {
    const hpx = constrain(c.val * scale, -100, 100);
    stroke(230); line(bx, originY - 100, bx, originY + 100);
    stroke(200); line(bx - 14, originY, bx + 14, originY);
    noStroke(); fill(c.color);
    if (hpx >= 0) rect(bx - barW/2, originY - hpx, barW, hpx, 4);
    else rect(bx - barW/2, originY, barW, -hpx, 4);
    fill(60); textSize(12); noStroke(); textAlign(CENTER);
    text(c.label, bx, originY + 16);
    bx += barW + barGap;
  }

  // Magnitude sparkline (last 10s)
  const sparkX = baseX + 3*(barW + barGap) + 24;
  const sparkW = w - (sparkX - x) - 16;
  const sparkH = 64;
  const sparkY = y + 36;
  noFill(); stroke(220); rect(sparkX, sparkY, sparkW, sparkH, 6);
  const hist = d.history;
  if (hist.length >= 2) {
    const now = performance.now();
    const t0 = now - 10000;
    stroke(99, 102, 241); noFill();
    beginShape();
    for (const p of hist) {
      const tx = map(p.t, t0, now, sparkX + 6, sparkX + sparkW - 6);
      const ty = map(constrain(p.m, 0, 2.0), 0, 2.0, sparkY + sparkH - 6, sparkY + 6);
      vertex(tx, ty);
    }
    endShape();
  }
}
