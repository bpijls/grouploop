// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');
const gameStateManager = new SceneManager(deviceManager);

// Register example game states
// gameStateManager.addScene('list', new DeviceListScene(deviceManager));
// gameStateManager.addScene('first', new FirstDeviceDetailsScene(deviceManager));
// gameStateManager.addScene('heatmap', new GridHeatmapScene(deviceManager));
// gameStateManager.addScene('circles', new StateDeviceCirclesScene(deviceManager));
// gameStateManager.addScene('physics', new PartialPhysicsScene(deviceManager));
gameStateManager.addScene('physicsWithGlow', new PartialPhysicsWithGlowScene(deviceManager));
gameStateManager.addScene('wander', new WanderingAttractorsScene(deviceManager));
gameStateManager.addScene('particles', new ParticleDeviceScene(deviceManager));
gameStateManager.addScene('eyes', new EyeDeviceScene(deviceManager));

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    // Connect to WebSocket server
    deviceManager.connect();
    // Default state
    gameStateManager.switchTo('eyes');
}

function draw() {
    push();
    translate(-width/2, -height/2);
    gameStateManager.draw();
    pop();
}

function keyPressed() {
    if (keyCode === RIGHT_ARROW) {
        gameStateManager.nextScene();
    } else if (keyCode === LEFT_ARROW) {
        gameStateManager.previousScene();
    } else {
        // Pass other key events to the current scene
        gameStateManager.keyPressed();
    }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}