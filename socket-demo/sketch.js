// Create device manager instance
const deviceManager = new HitloopDeviceManager('ws://feib.nl:5003');
const sceneManager = new SceneManager(deviceManager);
let fullScreenMode = false;
let grouploopOutput = null;
// Make grouploopOutput globally accessible
window.grouploopOutput = null;

// Initialize WebMidi and connect to "grouploop" device
WebMidi.enable()
    .then(() => {
        console.log('WebMidi enabled successfully');
        
        // Find and connect to the "grouploop" output device
        grouploopOutput = WebMidi.getOutputByName("grouploop");
        
        if (grouploopOutput) {
            console.log('Connected to grouploop MIDI device:', grouploopOutput.name);
            // Make it globally accessible
            window.grouploopOutput = grouploopOutput;
        } else {
            console.warn('grouploop MIDI device not found. Available devices:');
            WebMidi.outputs.forEach(output => {
                console.log('  -', output.name);
            });
        }
    })
    .catch(err => {
        console.error('WebMidi could not be enabled:', err);
    });

// Register example game states
// gameStateManager.addScene('list', new DeviceListScene(deviceManager));
// gameStateManager.addScene('first', new FirstDeviceDetailsScene(deviceManager));
// gameStateManager.addScene('heatmap', new GridHeatmapScene(deviceManager));
// gameStateManager.addScene('circles', new StateDeviceCirclesScene(deviceManager));
// gameStateManager.addScene('physics', new PartialPhysicsScene(deviceManager));
// gameStateManager.addScene('physicsWithGlow', new PartialPhysicsWithGlowScene(deviceManager));
// gameStateManager.addScene('wander', new WanderingAttractorsScene(deviceManager));
// gameStateManager.addScene('prototype', new PrototypeScene(deviceManager));
// gameStateManager.addScene('challenge1', new ChallengeOneScene(deviceManager));
// gameStateManager.addScene('start', new StartScene(deviceManager));
// gameStateManager.addScene('two', new TwoTeamsScene2(deviceManager));

// gameStateManager.addScene('move', new MoveScene(deviceManager));
// gameStateManager.addScene('playground', new Playground(deviceManager));
// gameStateManager.addScene('reveal', new ChallengeImageReveal(deviceManager));
// gameStateManager.addScene('popcorn', new PopCornScene(deviceManager));
// gameStateManager.addScene('particles', new ParticleDeviceScene(deviceManager));
//  gameStateManager.addScene('eyes', new EyeDeviceScene(deviceManager));
// gameStateManager.addScene('rainyDayGroup', new RainyDayGroup(deviceManager));
 
gameStateManager.addScene('rainyDaySingle', new RainyDaySingle(deviceManager));
gameStateManager.addScene('particles', new Particles(deviceManager));
gameStateManager.addScene('twoPlanets', new TwoPlanets(deviceManager));
gameStateManager.addScene('threePlanets', new ThreePlanets(deviceManager));
gameStateManager.addScene('race', new Race(deviceManager));
gameStateManager.addScene('reveal', new GroupReveal(deviceManager));
gameStateManager.addScene('hats', new HatsScene(deviceManager));
gameStateManager.addScene('midiController', new MidiControllerScene(deviceManager));

let uiFont;

function preload() {
    // Load a web-safe TTF so WEBGL text rendering is enabled
    //uiFont = loadFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf');
    uiFont = loadFont('https://fonts.gstatic.com/s/momotrustdisplay/v2/WWXPlieNYgyPZLyBUuEkKZFhFHyjqb1un2xNNgNa1A.ttf');
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
    gameStateManager.switchTo('rainyDaySingle');
}

function draw() {
    push();
    translate(-width/2, -height/2);
    sceneManager.draw();
    pop();
    if (window.Instructions) window.Instructions.draw();
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