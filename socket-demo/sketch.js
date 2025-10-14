// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');
const gameStateManager = new SceneManager(deviceManager);

// Register example game states
// gameStateManager.addScene('list', new DeviceListScene(deviceManager));
// gameStateManager.addScene('first', new FirstDeviceDetailsScene(deviceManager));
gameStateManager.addScene('heatmap', new GridHeatmapScene(deviceManager));
gameStateManager.addScene('circles', new StateDeviceCirclesScene(deviceManager));
gameStateManager.addScene('physics', new PartialPhysicsScene(deviceManager));
gameStateManager.addScene('physicsWithGlow', new PartialPhysicsWithGlowScene(deviceManager));
gameStateManager.addScene('wander', new WanderingAttractorsScene(deviceManager));
gameStateManager.addScene('prototype', new PrototypeScene(deviceManager));
gameStateManager.addScene('challenge1', new ChallengeOneScene(deviceManager));
gameStateManager.addScene('move', new MoveScene(deviceManager));
gameStateManager.addScene('playground', new Playground(deviceManager));
gameStateManager.addScene('reveal', new ChallengeImageReveal(deviceManager));

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Connect to WebSocket server
    deviceManager.connect();
    // Default state
    gameStateManager.switchTo('reveal');
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}