/* globals createCanvas, windowWidth, windowHeight, background, fill, noStroke, circle, text, textAlign, CENTER, touchStarted, touchMoved */

let ws = null;
let wsUrl = window.DEFAULT_WS_URL;
let deviceId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');

let acc = { ax: 127, ay: 127, az: 255 }; // start with 1g on Z
let circlePos = { x: 0, y: 0 };
let dragging = false;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function toHexByte(n) { return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'); }
function toHexWord(n) { return clamp(Math.round(n), 0, 65535).toString(16).padStart(4, '0'); }

function mapRange(v, inMin, inMax, outMin, outMax) {
    const t = (v - inMin) / (inMax - inMin);
    return outMin + (outMax - outMin) * t;
}

function setupMotion() {
    // iOS permission request; auto-connect on first touch
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        window.addEventListener('touchend', async () => {
            try { await DeviceMotionEvent.requestPermission(); } catch (_) {}
            connectWs();
        }, { once: true });
    } else {
        connectWs();
    }
}

function connectWs() {
    try { if (ws) ws.close(); } catch (e) {}
    ws = new WebSocket(wsUrl);
    ws.addEventListener('open', () => { ws.send('s'); });
}

let lastFrame = '';
function encodeFrame() {
    // Distances from circle to 4 screen corners mapped to 0..255 (near=255, far=0)
    const corners = [
        { x: 0, y: 0 }, // TL -> dNW
        { x: width, y: 0 }, // TR -> dNE
        { x: width, y: height }, // BR -> dSE
        { x: 0, y: height }, // BL -> dSW
    ];
    const maxDist = Math.hypot(width, height);
    const ds = corners.map(c => {
        const d = Math.hypot(circlePos.x - c.x, circlePos.y - c.y);
        return clamp(Math.round(mapRange(d, 0, maxDist, 255, 0)), 0, 255);
    });
    const idHex = deviceId;
    lastFrame = `${idHex}${toHexByte(acc.ax)}${toHexByte(acc.ay)}${toHexByte(acc.az)}${toHexByte(ds[0])}${toHexByte(ds[1])}${toHexByte(ds[2])}${toHexByte(ds[3])}`.toLowerCase();
    return `${lastFrame}\n`;
}

function sendFrame() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(encodeFrame());
}

window.setup = function() {
    const c = createCanvas(windowWidth, windowHeight);
    c.parent(document.getElementById('canvasWrap'));
    circlePos.x = width / 2;
    circlePos.y = height / 2;
    setupMotion();
    setInterval(sendFrame, 50); // 20 Hz
}

window.draw = function() {
    background(0);
    // Update accelerometer from p5 constants (approx -2g..2g typical range -> map to 0..255)
    if (typeof accelerationX !== 'undefined') {
        acc.ax = clamp(Math.round(mapRange(accelerationX, -2, 2, 0, 255)), 0, 255);
    }
    if (typeof accelerationY !== 'undefined') {
        acc.ay = clamp(Math.round(mapRange(accelerationY, -2, 2, 0, 255)), 0, 255);
    }
    if (typeof accelerationZ !== 'undefined') {
        acc.az = clamp(Math.round(mapRange(accelerationZ, -2, 2, 0, 255)), 0, 255);
    }
    // Draw four corner beacons: TL cyan, TR magenta, BR yellow, BL orange
    const sz = 24;
    noStroke();
    // Cyan
    fill(0, 255, 255); rect(0, 0, sz, sz);
    // Magenta
    fill(255, 0, 255); rect(width - sz, 0, sz, sz);
    // Yellow
    fill(255, 255, 0); rect(width - sz, height - sz, sz, sz);
    // Orange
    fill(255, 165, 0); rect(0, height - sz, sz, sz);
    // Draw draggable circle colored by accel mapping (-1g..1g -> 0..255)
    const mapAccel = (v) => clamp(Math.round(mapRange(mapRange(v, 0, 255, -2, 2), -1, 1, 0, 255)), 0, 255);
    fill(mapAccel(acc.ax), mapAccel(acc.ay), mapAccel(acc.az));
    noStroke();
    circle(circlePos.x, circlePos.y, 60);

    // HUD: connection status and last frame at bottom
    fill(255);
    textAlign(CENTER);
    const status = ws ? (ws.readyState === WebSocket.OPEN ? 'connected' : (ws.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected')) : 'disconnected';
    text(`status: ${status}  ws:${wsUrl}`, width/2, height - 24);
    text(lastFrame || '', width/2, height - 6);
}

function handlePointer(x, y) {
    circlePos.x = clamp(x, 0, width);
    circlePos.y = clamp(y, 0, height);
}

window.mousePressed = function() { dragging = true; handlePointer(mouseX, mouseY); }
window.mouseDragged = function() { if (dragging) handlePointer(mouseX, mouseY); }
window.mouseReleased = function() { dragging = false; }

window.touchStarted = function(e) { dragging = true; if (e.touches && e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY); return false; }
window.touchMoved = function(e) { if (e.touches && e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY); return false; }
window.touchEnded = function() { dragging = false; }


