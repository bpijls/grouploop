/* globals constrain, map, push, pop, translate, rotateX, rotateY, rotateZ, noFill, stroke, box, strokeWeight, line */

function toHexByte(n) { return constrain(n, 0, 255).toString(16).padStart(2, '0'); }
function toHexWord(n) { return constrain(n, 0, 65535).toString(16).padStart(4, '0'); }

class Device {
  constructor(id, x, z, color, vx, vz) {
    this.id = id;
    this.pos = { x, z };
		this.orientation = { rotZ: 0, rotX: 0, rotY: 0 };
		this.angularVelocity = { rotZ: 0, rotX: 0, rotY: 0 };
		this.color = color;
		this.ws = null;
    this.vel = { x: vx, z: vz };
	}

	connect(wsUrl) {
		this.ws = new WebSocket(wsUrl);
	}

	disconnect() {
		try { this.ws && this.ws.close(); } catch (e) {}
		this.ws = null;
	}

  update(dtSeconds) {
    const mode = window.cfg.sim.rotationMode;
    if (mode === 'random') {
      this.angularVelocity.rotZ += (Math.random() - 0.5) * 0.2;
      this.angularVelocity.rotX += (Math.random() - 0.5) * 0.2;
      this.angularVelocity.rotY += (Math.random() - 0.5) * 0.2;
      this.angularVelocity.rotZ *= 0.98;
      this.angularVelocity.rotX *= 0.98;
      this.angularVelocity.rotY *= 0.98;
    } else if (mode === 'constant') {
      // maintain current angular velocity (no random walk or damping)
      // if zero, seed with small constant values so it visibly rotates
      if (this.angularVelocity.rotZ === 0 && this.angularVelocity.rotX === 0 && this.angularVelocity.rotY === 0) {
        this.angularVelocity.rotZ = 0.5;
        this.angularVelocity.rotX = 0.3;
        this.angularVelocity.rotY = 0.2;
      }
    } else if (mode === 'off') {
      this.angularVelocity.rotZ = 0;
      this.angularVelocity.rotX = 0;
      this.angularVelocity.rotY = 0;
    }
    // clamp by cfg.sim.angularMax
    const maxRZ = window.cfg.sim.angularMax.rotZ;
    const maxRX = window.cfg.sim.angularMax.rotX;
    const maxRY = window.cfg.sim.angularMax.rotY;
    this.angularVelocity.rotZ = constrain(this.angularVelocity.rotZ, -maxRZ, maxRZ);
    this.angularVelocity.rotX = constrain(this.angularVelocity.rotX, -maxRX, maxRX);
    this.angularVelocity.rotY = constrain(this.angularVelocity.rotY, -maxRY, maxRY);
    this.orientation.rotZ += this.angularVelocity.rotZ * dtSeconds;
    this.orientation.rotX += this.angularVelocity.rotX * dtSeconds;
    this.orientation.rotY += this.angularVelocity.rotY * dtSeconds;
	}

	getAccelerometer() {
		const g = 1.0;
		const axG = 2 * g * Math.sin(this.orientation.rotX);
		const ayG = 2 * g * Math.sin(this.orientation.rotZ);
		const azG = 2 * g * Math.cos(this.orientation.rotX) * Math.cos(this.orientation.rotZ);
		const ax = Math.round(map(axG, -2, 2, 0, 255));
		const ay = Math.round(map(ayG, -2, 2, 0, 255));
		const az = Math.round(map(azG, -2, 2, 0, 255));
		return { ax, ay, az };
	}

  getBeaconDistances(world) {
    const halfW = world.gridWidth / 2;
    const halfH = world.gridHeight / 2; // using z as vertical in plane
    const beacons = [
      { x: -halfW, z: -halfH }, // top-left
      { x: halfW, z: -halfH },  // top-right
      { x: halfW, z: halfH },   // bottom-right
      { x: -halfW, z: halfH },  // bottom-left
    ];
    const maxDist = Math.hypot(halfW, halfH);
    const vals = beacons.map(b => {
      const d = Math.hypot(this.pos.x - b.x, this.pos.z - b.z);
      return constrain(Math.round(map(d, 0, maxDist, 255, 0)), 0, 255);
    });
    return { dTL: vals[0], dTR: vals[1], dBR: vals[2], dBL: vals[3] };
  }

  encodeFrame(world) {
    let ax, ay, az;
    if (window.cfg.sim.rotationMode === 'constant') {
      // Map angular velocity components to bytes
      const maxRX = Math.max(1e-6, window.cfg.sim.angularMax.rotX);
      const maxRZ = Math.max(1e-6, window.cfg.sim.angularMax.rotZ);
      const maxRY = Math.max(1e-6, window.cfg.sim.angularMax.rotY);
      ax = Math.round(map(constrain(this.angularVelocity.rotX, -maxRX, maxRX), -maxRX, maxRX, 0, 255));
      ay = Math.round(map(constrain(this.angularVelocity.rotZ, -maxRZ, maxRZ), -maxRZ, maxRZ, 0, 255));
      az = Math.round(map(constrain(this.angularVelocity.rotY, -maxRY, maxRY), -maxRY, maxRY, 0, 255));
    } else {
      const acc = this.getAccelerometer();
      ax = acc.ax; ay = acc.ay; az = acc.az;
    }
    const { dTL, dTR, dBR, dBL } = this.getBeaconDistances(world);
		const idHex = toHexWord(this.id);
		const frame = `${idHex}${toHexByte(ax)}${toHexByte(ay)}${toHexByte(az)}${toHexByte(dTL)}${toHexByte(dTR)}${toHexByte(dBR)}${toHexByte(dBL)}\n`;
		return frame.toLowerCase();
	}

  sendFrame(world) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(this.encodeFrame(world));
	}

  draw(cfg) {
		push();
    translate(this.pos.x, -cfg.device.heightY/2, this.pos.z);
    rotateX(-Math.PI/2); // align cube orientation for X-Z plane view
    // apply simulated orientation so rotation is visible (Z, X, Y)
    rotateZ(this.orientation.rotZ);
    rotateX(this.orientation.rotX);
    rotateY(this.orientation.rotY);
		noFill();
		stroke(this.color[0], this.color[1], this.color[2]);
		box(cfg.device.cubeSize, cfg.device.cubeSize, cfg.device.cubeSize);
		strokeWeight(2);
    stroke(255, 64, 64); line(0, 0, 0, cfg.device.axisLen, 0, 0); // X
    stroke(64, 255, 64); line(0, 0, 0, 0, 0, cfg.device.axisLen); // Z (after rotateX)
    stroke(64, 128, 255); line(0, 0, 0, 0, cfg.device.axisLen, 0); // Y up
		pop();
	}

  tickPhysics(dt, world) {
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const halfW = world.gridWidth / 2;
    const halfH = world.gridHeight / 2;
    // bounce on X
    if (this.pos.x <= -halfW || this.pos.x >= halfW) {
      this.pos.x = constrain(this.pos.x, -halfW, halfW);
      this.vel.x *= -1;
    }
    // bounce on Z
    if (this.pos.z <= -halfH || this.pos.z >= halfH) {
      this.pos.z = constrain(this.pos.z, -halfH, halfH);
      this.vel.z *= -1;
    }
  }
}

window.Device = Device;

