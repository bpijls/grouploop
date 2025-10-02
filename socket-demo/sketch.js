// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');

function setup() {
    createCanvas(400, 400);

    // Connect to WebSocket server
    deviceManager.connect();
}

function draw() {
    background(220);

    // Display device information
    const deviceCount = deviceManager.getDeviceCount();
    text(`Devices: ${deviceCount}`, 10, 20);

    // Display data from first device if available
    if (deviceCount > 0) {
        const devices = deviceManager.getAllDevices();
        const firstDevice = devices.values().next().value;
        const data = firstDevice.getSensorData();

        text(`Device ID: ${data.id}`, 10, 40);
        text(`Accel: ${data.ax}, ${data.ay}, ${data.az}`, 10, 60);
        text(`Distances: NW:${data.dNW} NE:${data.dNE} SW:${data.dSW} SE:${data.dSE}`, 10, 80);
    }
}