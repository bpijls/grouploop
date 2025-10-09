class FirstDeviceDetailsScene extends Scene {
    setup() {}
    draw() {
        background(220);
        const dm = this.deviceManager;
        const count = dm.getDeviceCount();
        text(`Devices: ${count}`, 10, 20);
        if (count === 0) return;
        const first = dm.getAllDevices().values().next().value;
        const data = first.getSensorData();
        text(`Device ID: ${data.id}`, 10, 40);
        text(`Accel: ${data.ax}, ${data.ay}, ${data.az}`, 10, 60);
        text(`Distances: NW:${data.dNW} NE:${data.dNE} SW:${data.dSW} SE:${data.dSE}`, 10, 80);
    }
}



