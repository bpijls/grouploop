class StateGridHeatmap extends GameState {
    setup() {}
    draw() {
        background(0);
        const dm = this.deviceManager;
        const margin = 20;
        const gridW = width - margin * 2;
        const gridH = height - margin * 2;
        // simple heatmap: brighter for closer devices (lower sum of distances)
        for (const device of dm.getAllDevices().values()) {
            const d = device.getSensorData();
            const proximity = 1020 - (d.dNW + d.dNE + d.dSW + d.dSE); // 4*255 max
            const shade = Math.max(0, Math.min(255, Math.round(proximity / 4)));
            fill(shade, 64, 64);
            noStroke();
            const x = Math.random() * gridW + margin;
            const y = Math.random() * gridH + margin;
            circle(x, y, 10);
        }
        fill(255);
        text('Heatmap (random placement per frame)', 10, height - 10);
    }
}


