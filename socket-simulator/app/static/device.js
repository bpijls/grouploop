/* globals constrain, map, push, pop, translate, rotateX, rotateY, rotateZ, noFill, stroke, box, strokeWeight, line */

function toHexByte(n) { return constrain(n, 0, 255).toString(16).padStart(2, '0'); }
function toHexWord(n) { return constrain(n, 0, 65535).toString(16).padStart(4, '0'); }

class Device {
  constructor(id, x, z, color, vx, vz) {
    this.id = id;
    this.pos = { x, z };
		this.orientation = { roll: 0, pitch: 0, yaw: 0 };
		this.angularVelocity = { roll: 0, pitch: 0, yaw: 0 };
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
		this.angularVelocity.roll += (Math.random() - 0.5) * 0.2;
		this.angularVelocity.pitch += (Math.random() - 0.5) * 0.2;
		this.angularVelocity.yaw += (Math.random() - 0.5) * 0.2;
		this.angularVelocity.roll *= 0.98;
		this.angularVelocity.pitch *= 0.98;
		this.angularVelocity.yaw *= 0.98;
		this.orientation.roll += this.angularVelocity.roll * dtSeconds;
		this.orientation.pitch += this.angularVelocity.pitch * dtSeconds;
		this.orientation.yaw += this.angularVelocity.yaw * dtSeconds;
	}

	getAccelerometer() {
		const g = 1.0;
		const axG = 2 * g * Math.sin(this.orientation.pitch);
		const ayG = 2 * g * Math.sin(this.orientation.roll);
		const azG = 2 * g * Math.cos(this.orientation.pitch) * Math.cos(this.orientation.roll);
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
		const { ax, ay, az } = this.getAccelerometer();
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
    // apply simulated orientation so rotation is visible
    rotateX(this.orientation.pitch);
    rotateY(this.orientation.yaw);
    rotateZ(this.orientation.roll);
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

