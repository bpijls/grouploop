// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');
const gameStateManager = new GameStateManager(deviceManager);

// Register example game states
gameStateManager.addState('list', new StateDevicesList(deviceManager));
gameStateManager.addState('first', new StateFirstDeviceDetails(deviceManager));
gameStateManager.addState('heatmap', new StateGridHeatmap(deviceManager));
gameStateManager.addState('circles', new StateDeviceCircles(deviceManager));

function setup() {
    createCanvas(windowWidth, windowHeight);

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
        gameStateManager.nextState();
    } else if (keyCode === LEFT_ARROW) {
        gameStateManager.previousState();
    }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}