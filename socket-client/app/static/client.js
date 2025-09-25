let ws = null;
let isConnected = false;
let devices = {}; // deviceId -> {ax, ay, az, d1, d2, d3, d4, raw}
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
    const text = String(ev.data || '').trim();
    if (!text) return;
    
    // Allow multiple frames per message (newline-delimited)
    const frames = text.split(/\n+/).filter(Boolean);
    for (const frame of frames) {        
      // New hex format: ID(2 bytes=4 hex) + ax(1) + ay(1) + az(1) + dTL(1) + dTR(1) + dBR(1) + dBL(1)
      // Total 18 hex chars
      const hex = frame.toLowerCase();
      const isHex = /^[0-9a-f]+$/.test(hex) && (hex.length === 18);
      if (isHex) {
        const id = hex.slice(0, 4); // keep device ID as hex string
        const axB = parseInt(hex.slice(4, 6), 16);
        const ayB = parseInt(hex.slice(6, 8), 16);
        const azB = parseInt(hex.slice(8, 10), 16);
        const d1 = parseInt(hex.slice(10, 12), 16);
        const d2 = parseInt(hex.slice(12, 14), 16);
        const d3 = parseInt(hex.slice(14, 16), 16);
        const d4 = parseInt(hex.slice(16, 18), 16);

        // Map 0..255 -> -2..2 g for accel display
        const ax = (axB / 255) * 4 - 2;
        const ay = (ayB / 255) * 4 - 2;
        const az = (azB / 255) * 4 - 2;

        if (!devices[id]) {
          devices[id] = { ax: 0, ay: 0, az: 0, d1: 0, d2: 0, d3: 0, d4: 0, raw: '' };
          deviceOrder.push(id);
        }
        devices[id].ax = ax;
        devices[id].ay = ay;
        devices[id].az = az;
        devices[id].d1 = d1;
        devices[id].d2 = d2;
        devices[id].d3 = d3;
        devices[id].d4 = d4;
        devices[id].raw = hex;
        continue;
      }
      else
        console.log("non hex");
      // Ignore any non-hex payloads
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
  const cellW = 220;
  const cellH = 160;
  const gap = 12;
  const cols = max(1, floor((width - padding*2 + gap) / (cellW + gap)));

  let i = 0;
  for (const id of deviceOrder) {
    const r = floor(i / cols);
    const c = i % cols;
    const x = padding + c * (cellW + gap);
    const y = padding + r * (cellH + gap);
    drawDeviceCell(id, x, y, cellW, cellH);
    i++;
  }

  if (!isConnected) {
    fill(120); noStroke(); textSize(14);
    text('Enter WS URL (e.g., ws://localhost:5003/) and Connect. Frames: 18-char hex (id+ax+ay+az+d1..d4).', padding, height - padding);
  }
}

function drawDeviceCell(id, x, y, w, h) {
  stroke(220); fill(255);
  rect(x, y, w, h, 8);

  // header: device ID
  fill(30); noStroke(); textSize(16);
  textAlign(LEFT, BASELINE);
  text(id, x + 12, y + 22);

  const d = devices[id];
  // 7 bars: ax, ay, az, d1, d2, d3, d4
  const labels = ['ax', 'ay', 'az', 'd1', 'd2', 'd3', 'd4'];
  const values = [d.ax, d.ay, d.az, d.d1, d.d2, d.d3, d.d4];
  // Accelerometer colors (R,G,B) + beacon distance colors (cyan, magenta, yellow, orange)
  const colorsArr = [
    color(239,68,68),   // ax - red
    color(34,197,94),   // ay - green
    color(59,130,246),  // az - blue
    color(0,255,255),   // d1 - cyan (top-left)
    color(255,0,255),   // d2 - magenta (top-right)
    color(255,255,0),   // d3 - yellow (bottom-right)
    color(255,165,0)    // d4 - orange (bottom-left)
  ];

  const plotX = x + 12;
  const plotY = y + 36;
  const plotW = w - 24;
  const plotH = 90;

  const barW = 20;
  const barGap = Math.max(8, Math.floor((plotW - 7*barW) / 6));
  let bx = plotX;

  // Axes background
  stroke(230); line(plotX, plotY + plotH/2, plotX + plotW, plotY + plotH/2);

  for (let i = 0; i < 7; i++) {
    const v = values[i];
    const col = colorsArr[i];
    const label = labels[i];
    let hpx = 0;
    if (i <= 2) {
      // accel -2..2 g scaled to -100..100 px
      hpx = constrain(v * 50, -100, 100);
    } else {
      // distances 0..255 scaled to 0..100 px
      hpx = constrain(map(v, 0, 255, 0, 100), 0, 100);
    }
    stroke(200); line(bx - 14, plotY + plotH/2, bx + 14, plotY + plotH/2);
    noStroke(); fill(col);
    if (i <= 2) {
      if (hpx >= 0) rect(bx - barW/2, plotY + plotH/2 - hpx, barW, hpx, 4);
      else rect(bx - barW/2, plotY + plotH/2, barW, -hpx, 4);
    } else {
      rect(bx - barW/2, plotY + plotH/2 - hpx, barW, hpx, 4);
    }
    fill(60); textSize(12); noStroke(); textAlign(CENTER);
    text(label, bx, plotY + plotH/2 + 16);
    bx += barW + barGap;
  }

  // raw frame
  fill(80); noStroke(); textSize(12); textAlign(LEFT, BASELINE);
  const rawText = d.raw || '';
  text(rawText, x + 12, y + h - 12);
}
