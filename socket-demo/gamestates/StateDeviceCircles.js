class StateDeviceCircles extends GameState {
    setup() {}
    draw() {
        background(0);
        const dm = this.deviceManager;
        const count = dm.getDeviceCount();
        fill(255);
        text(`Devices: ${count}`, 10, 20);
        for (const device of dm.getAllDevices().values()) {
            const d = device.getSensorData();
            console.log(d);
            noStroke();
            fill(...d.color);
            // Reconstruct (x,y) from corner distances exactly like the emulator
            const toPx = v => (255 - (v || 0)) / 255 * Math.hypot(width, height);
            const dNW = toPx(d.dNW), dNE = toPx(d.dNE), dSW = toPx(d.dSW);
            // Solve using squared-distance differences
            const xNum = (width * width) - (dNE * dNE - dNW * dNW);
            const yNum = (height * height) - (dSW * dSW - dNW * dNW);
            let x = xNum / (2 * width);
            let y = yNum / (2 * height);
            // Keep circles inside the frame
            x = constrain(x, 20, width - 20);
            y = constrain(y, 20, height - 20);
            ellipse(x, y, 40);
        }
    }
}
