/* globals createDiv, createSpan, createSlider, createButton */

function setupUI(cfg, handlers) {
	const panel = document.querySelector('.panel');

	// Replace HTML controls with p5-created elements, mounted into panel
	panel.innerHTML = '<h1>Simulator</h1>';

    // WebSocket URL control
    const urlWrap = createDiv('').parent(panel).addClass('control');
    createSpan('WS URL: ').parent(urlWrap);
    const urlInput = createInput(cfg.websocketUrl).parent(urlWrap);
    const urlBtn = createButton('Apply').parent(urlWrap);
    urlBtn.mousePressed(() => {
        const val = urlInput.value();
        if (val && typeof val === 'string') handlers.onWsUrlChange(val.trim());
    });

	const devWrap = createDiv('').parent(panel).addClass('control');
	createSpan('Devices: ').parent(devWrap);
	const devValue = createSpan(String(cfg.sim.defaultDevices)).parent(devWrap);
	const devSlider = createSlider(cfg.sim.minDevices, cfg.sim.maxDevices, cfg.sim.defaultDevices, 1).parent(devWrap);
	devSlider.input(() => {
		handlers.onDeviceCountChange(devSlider.value());
		devValue.html(String(devSlider.value()));
	});

	const rateWrap = createDiv('').parent(panel).addClass('control');
	createSpan('Send rate (Hz): ').parent(rateWrap);
	const rateValue = createSpan(String(cfg.sim.defaultHz)).parent(rateWrap);
	const rateSlider = createSlider(cfg.sim.minHz, cfg.sim.maxHz, cfg.sim.defaultHz, 1).parent(rateWrap);
	rateSlider.input(() => {
		handlers.onRateChange(rateSlider.value());
		rateValue.html(String(rateSlider.value()));
	});

	const row = createDiv('').parent(panel).addClass('control row');
	const startBtn = createButton('Start').parent(row);
	const stopBtn = createButton('Stop').parent(row);
	stopBtn.attribute('disabled', '');
	startBtn.mousePressed(() => { handlers.onStart(); startBtn.attribute('disabled', ''); stopBtn.removeAttribute('disabled'); });
	stopBtn.mousePressed(() => { handlers.onStop(); stopBtn.attribute('disabled', ''); startBtn.removeAttribute('disabled'); });

	const status = createDiv('').parent(panel).addClass('status');
	status.html(`WS endpoint: <code>${cfg.websocketUrl}</code> · Active sockets: <span id="socketCount">0</span>`);

    // Angular velocity sliders
    const angHeader = createDiv('<strong>Angular velocity max (rad/s)</strong>').parent(panel).addClass('control');
    // Rotation mode selector
    const modeWrap = createDiv('').parent(panel).addClass('control');
    createSpan('rotation: ').parent(modeWrap);
    const modeSelect = createSelect().parent(modeWrap);
    modeSelect.option('off', 'off');
    modeSelect.option('constant', 'constant');
    modeSelect.option('random', 'random');
    modeSelect.selected(cfg.sim.rotationMode);
    modeSelect.changed(() => { handlers.onRotationModeChange(modeSelect.value()); });
    const rollWrap = createDiv('').parent(panel).addClass('control');
    createSpan('rotZ: ').parent(rollWrap);
    const rollVal = createSpan(String(cfg.sim.angularMax.rotZ.toFixed(2))).parent(rollWrap);
    const rollSlider = createSlider(0, 3, cfg.sim.angularMax.rotZ, 0.01).parent(rollWrap);
    rollSlider.input(() => { handlers.onAngularMaxChange('rotZ', rollSlider.value()); rollVal.html(rollSlider.value().toFixed(2)); });

    const pitchWrap = createDiv('').parent(panel).addClass('control');
    createSpan('rotX: ').parent(pitchWrap);
    const pitchVal = createSpan(String(cfg.sim.angularMax.rotX.toFixed(2))).parent(pitchWrap);
    const pitchSlider = createSlider(0, 3, cfg.sim.angularMax.rotX, 0.01).parent(pitchWrap);
    pitchSlider.input(() => { handlers.onAngularMaxChange('rotX', pitchSlider.value()); pitchVal.html(pitchSlider.value().toFixed(2)); });

    const yawWrap = createDiv('').parent(panel).addClass('control');
    createSpan('rotY: ').parent(yawWrap);
    const yawVal = createSpan(String(cfg.sim.angularMax.rotY.toFixed(2))).parent(yawWrap);
    const yawSlider = createSlider(0, 3, cfg.sim.angularMax.rotY, 0.01).parent(yawWrap);
    yawSlider.input(() => { handlers.onAngularMaxChange('rotY', yawSlider.value()); yawVal.html(yawSlider.value().toFixed(2)); });

    // Linear velocity sliders (X/Z)
    const velHeader = createDiv('<strong>Velocity (units/s)</strong>').parent(panel).addClass('control');
    const minXWrap = createDiv('').parent(panel).addClass('control');
    createSpan('min vx: ').parent(minXWrap);
    const minXVal = createSpan(String(cfg.world.minSpeedX.toFixed(0))).parent(minXWrap);
    const minXSlider = createSlider(0, 300, cfg.world.minSpeedX, 1).parent(minXWrap);
    minXSlider.input(() => { handlers.onSpeedChange('minSpeedX', minXSlider.value()); minXVal.html(String(minXSlider.value())); });

    const maxXWrap = createDiv('').parent(panel).addClass('control');
    createSpan('max vx: ').parent(maxXWrap);
    const maxXVal = createSpan(String(cfg.world.maxSpeedX.toFixed(0))).parent(maxXWrap);
    const maxXSlider = createSlider(0, 300, cfg.world.maxSpeedX, 1).parent(maxXWrap);
    maxXSlider.input(() => { handlers.onSpeedChange('maxSpeedX', maxXSlider.value()); maxXVal.html(String(maxXSlider.value())); });

    const minZWrap = createDiv('').parent(panel).addClass('control');
    createSpan('min vz: ').parent(minZWrap);
    const minZVal = createSpan(String(cfg.world.minSpeedZ.toFixed(0))).parent(minZWrap);
    const minZSlider = createSlider(0, 300, cfg.world.minSpeedZ, 1).parent(minZWrap);
    minZSlider.input(() => { handlers.onSpeedChange('minSpeedZ', minZSlider.value()); minZVal.html(String(minZSlider.value())); });

    const maxZWrap = createDiv('').parent(panel).addClass('control');
    createSpan('max vz: ').parent(maxZWrap);
    const maxZVal = createSpan(String(cfg.world.maxSpeedZ.toFixed(0))).parent(maxZWrap);
    const maxZSlider = createSlider(0, 300, cfg.world.maxSpeedZ, 1).parent(maxZWrap);
    maxZSlider.input(() => { handlers.onSpeedChange('maxSpeedZ', maxZSlider.value()); maxZVal.html(String(maxZSlider.value())); });
}

window.setupUI = setupUI;

