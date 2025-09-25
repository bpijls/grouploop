// Global configuration and shared state
window.cfg = {
	canvas: { width: 1024, height: 768 },
	websocketUrl: 'ws://localhost:5003',
	device: {
		cubeSize: 40,
		heightY: 20,
		axisLen: 50,
		axisLen: 50,
	},
	sim: {
		minDevices: 1,
		maxDevices: 50,
		defaultDevices: 10,
		minHz: 10,
		maxHz: 50,
		defaultHz: 25,
		seed: 1337,
	},
	world: {
		gridWidth: 800,
		gridHeight: 600,
		gridStep: 50,
		beaconRadius: 10,
		minSpeed: 40,
		maxSpeed: 120,
	},
	colors: {
		bg: 10
	}
};

