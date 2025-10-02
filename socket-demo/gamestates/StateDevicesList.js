class StateDevicesList extends GameState {
    setup() {}
    draw() {
        background(220);
        const dm = this.deviceManager;
        const count = dm.getDeviceCount();
        text(`Devices: ${count}`, 10, 20);
        let y = 40;
        for (const device of dm.getAllDevices().values()) {
            const d = device.getSensorData();
            text(`ID:${d.id} ax:${d.ax} ay:${d.ay} az:${d.az}`, 10, y);
            y += 16;
            if (y > height - 10) break;
        }
    }
}


