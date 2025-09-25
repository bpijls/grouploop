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
		rotationMode: 'random', // 'off' | 'constant' | 'random'
		angularMax: {
			rotZ: 1.2,
			rotX: 1.2,
			rotY: 1.2,
		},
	},
	world: {
		gridWidth: 800,
		gridHeight: 600,
		gridStep: 50,
		beaconRadius: 10,
		minSpeedX: 40,
		minSpeedZ: 40,
		maxSpeedX: 120,
		maxSpeedZ: 120,
	},
	colors: {
		bg: 10
	}
};

