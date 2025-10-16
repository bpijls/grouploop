// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');
const sceneManager = new SceneManager(deviceManager);
let fullScreenMode = false;

// Register example game states
// sceneManager.addScene('list', new DeviceListScene(deviceManager));
// sceneManager.addScene('first', new FirstDeviceDetailsScene(deviceManager));
// sceneManager.addScene('heatmap', new GridHeatmapScene(deviceManager));
// sceneManager.addScene('circles', new StateDeviceCirclesScene(deviceManager));
// sceneManager.addScene('physics', new PartialPhysicsScene(deviceManager));
// sceneManager.addScene('physicsWithGlow', new PartialPhysicsWithGlowScene(deviceManager));
// sceneManager.addScene('wander', new WanderingAttractorsScene(deviceManager));
// sceneManager.addScene('prototype', new PrototypeScene(deviceManager));
// sceneManager.addScene('challenge1', new ChallengeOneScene(deviceManager));
sceneManager.addScene('move', new MoveScene(deviceManager));
sceneManager.addScene('playground', new Playground(deviceManager));
sceneManager.addScene('reveal', new ChallengeImageReveal(deviceManager));
sceneManager.addScene('popcorn', new PopCornScene(deviceManager));
sceneManager.addScene('hats', new HatsScene(deviceManager));
sceneManager.addScene('particles', new ParticleDeviceScene(deviceManager));
sceneManager.addScene('eyes', new EyeDeviceScene(deviceManager));
sceneManager.addScene('earth', new EarthScene(deviceManager));

let uiFont;

function preload() {
    // Load a web-safe TTF so WEBGL text rendering is enabled
    uiFont = loadFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    if (uiFont) {
        textFont(uiFont);
    }
    textSize(16);
    // Connect to WebSocket server
    deviceManager.connect();
    // Default state
    sceneManager.switchTo('popcorn');
}

function draw() {
    push();
    translate(-width/2, -height/2);
    sceneManager.draw();
    pop();
}

function keyPressed() {
    if (keyCode === RIGHT_ARROW) {
        sceneManager.nextScene();
    } else if (keyCode === LEFT_ARROW) {
        sceneManager.previousScene();
    } else if (key === 'f') {
        fullscreen(fullScreenMode);
        fullScreenMode = !fullScreenMode;
        resizeCanvas(windowWidth, windowHeight);

    } else {
        // Pass other key events to the current scene
        sceneManager.keyPressed();
    }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}