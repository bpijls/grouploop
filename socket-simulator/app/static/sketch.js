/* globals createCanvas, WEBGL, orbitControl, background, stroke, noFill, fill, line, push, pop, translate, sphere */

let devices = [];
let running = false;
let targetHz = window.cfg.sim.defaultHz;
let deviceCount = window.cfg.sim.defaultDevices;
let lastTime = 0;
let sendTimer = null;

// Deterministic PRNG (xorshift32)
let prngState = window.cfg.sim.seed >>> 0;
function rand() {
	prngState ^= prngState << 13; prngState >>>= 0;
	prngState ^= prngState >> 17; prngState >>>= 0;
	prngState ^= prngState << 5;  prngState >>>= 0;
	return (prngState >>> 0) / 4294967296;
}
function randRange(min, max) { return min + (max - min) * rand(); }
function resetRng() { prngState = window.cfg.sim.seed >>> 0; }

function randomColor() {
	return [
		Math.floor(100 + Math.random() * 155),
		Math.floor(100 + Math.random() * 155),
		Math.floor(100 + Math.random() * 155)
	];
}

function updateSocketCount() {
	const open = devices.filter(d => d.ws && d.ws.readyState === WebSocket.OPEN).length;
	const el = document.getElementById('socketCount');
	if (el) el.textContent = String(open);
}

function createDevices(n) {
	devices.forEach(d => d.disconnect());
	devices = [];
	resetRng();
	const halfW = window.cfg.world.gridWidth / 2;
	const halfH = window.cfg.world.gridHeight / 2;
	for (let i = 0; i < n; i++) {
		const id = Math.floor(rand() * 65536);
		const x = randRange(-halfW, halfW);
		const z = randRange(-halfH, halfH);
		const speed = randRange(window.cfg.world.minSpeed, window.cfg.world.maxSpeed);
		const dir = randRange(0, Math.PI * 2);
		const vx = Math.cos(dir) * speed;
		const vz = Math.sin(dir) * speed;
		const color = randomColor();
		const d = new window.Device(id, x, z, color, vx, vz);
		devices.push(d);
	}
	updateSocketCount();
}

function connectAll() {
	devices.forEach(d => {
		d.connect(window.cfg.websocketUrl);
		d.ws && d.ws.addEventListener('open', updateSocketCount);
		d.ws && d.ws.addEventListener('close', updateSocketCount);
		d.ws && d.ws.addEventListener('error', updateSocketCount);
	});
}

function disconnectAll() {
	devices.forEach(d => d.disconnect());
	updateSocketCount();
}

function startSender() {
	stopSender();
	const intervalMs = Math.max(1, Math.floor(1000 / targetHz));
	sendTimer = setInterval(() => {
		if (!running) return;
		devices.forEach(d => d.sendFrame(window.cfg.world));
	}, intervalMs);
}

function stopSender() {
	if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
}

function startSim() {
	if (running) return;
	running = true;
	connectAll();
	startSender();
}

function stopSim() {
	running = false;
	stopSender();
	disconnectAll();
}

// p5
window.setup = function() {
	const c = createCanvas(window.cfg.canvas.width, window.cfg.canvas.height, WEBGL);
	c.parent(document.querySelector('.canvas-wrap'));
	createDevices(deviceCount);

	window.setupUI(window.cfg, {
		onDeviceCountChange: (val) => {
			deviceCount = val;
			createDevices(deviceCount);
			if (running) connectAll();
		},
		onRateChange: (hz) => {
			targetHz = hz;
			if (running) startSender();
		},
		onStart: startSim,
		onStop: stopSim,
	});
};

window.draw = function() {
	orbitControl(2, 2, 0.1);
	background(window.cfg.colors.bg);

	const now = performance.now();
	const dt = (now - lastTime) / 1000;
	lastTime = now;

	// Ground grid in X-Z plane, Y up
	push();
	translate(0, 0, 0);
	stroke(50); noFill();
	const halfW = window.cfg.world.gridWidth / 2;
	const halfH = window.cfg.world.gridHeight / 2;
	for (let x = -halfW; x <= halfW; x += window.cfg.world.gridStep) {
		line(x, 0, -halfH, x, 0, halfH);
	}
	for (let z = -halfH; z <= halfH; z += window.cfg.world.gridStep) {
		line(-halfW, 0, z, halfW, 0, z);
	}
	pop();

	// Beacon spheres at corners (colors: cyan, magenta, yellow, orange)
	push();
	noStroke();
	// top-left
	fill(0, 255, 255);
	translate(-halfW, 0, -halfH); sphere(window.cfg.world.beaconRadius);
	// top-right
	fill(255, 0, 255);
	translate( window.cfg.world.gridWidth, 0, 0); sphere(window.cfg.world.beaconRadius);
	// bottom-right
	fill(255, 255, 0);
	translate( 0, 0,  window.cfg.world.gridHeight); sphere(window.cfg.world.beaconRadius);
	// bottom-left
	fill(255, 165, 0);
	translate(-window.cfg.world.gridWidth, 0, 0); sphere(window.cfg.world.beaconRadius);
	pop();

	// Update rotation, physics and draw devices
	devices.forEach(d => d.update(dt));
	devices.forEach(d => d.tickPhysics(dt, window.cfg.world));
	devices.forEach(d => d.draw(window.cfg));
};

