/* globals createDiv, createSpan, createSlider, createButton */

function setupUI(cfg, handlers) {
	const panel = document.querySelector('.panel');

	// Replace HTML controls with p5-created elements, mounted into panel
	panel.innerHTML = '<h1>Simulator</h1>';

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
}

window.setupUI = setupUI;

