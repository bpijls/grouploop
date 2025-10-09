// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');
const gameStateManager = new SceneManager(deviceManager);

// Register example game states
gameStateManager.addScene('list', new DeviceListScene(deviceManager));
gameStateManager.addScene('first', new FirstDeviceDetailsScene(deviceManager));
gameStateManager.addScene('heatmap', new GridHeatmapScene(deviceManager));
gameStateManager.addScene('wander', new WanderingAttractorsScene(deviceManager));

function setup() {
    createCanvas(400, 400);

    // Connect to WebSocket server
    deviceManager.connect();
    // Default state
    gameStateManager.switchTo('list');
}

function draw() {
    gameStateManager.draw();
}

function keyPressed() {
    if (keyCode === RIGHT_ARROW) {
        gameStateManager.nextScene();
    } else if (keyCode === LEFT_ARROW) {
        gameStateManager.previousScene();
    }
}