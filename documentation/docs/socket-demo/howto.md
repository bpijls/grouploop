# How-to

## Read the state of a device

Example: read the first device and its values.

```js
const devices = deviceManager.getAllDevices();
if (devices.size > 0) {
  const first = devices.values().next().value;
  const data = first.getSensorData();
  // data.ax, data.ay, data.az, data.dNW, data.dNE, data.dSW, data.dSE
}
```

Retrieve a known device by id (hex string):

```js
const d = deviceManager.getDevice('1a2b');
if (d) {
  const { ax, ay, az } = d.getSensorData();
}
```

## Add a new Scene

1. Create a new file under `socket-demo/scenes/`, e.g. `MyScene.js`:

```js
class MyScene extends Scene {
  setup() {}
  draw() {
    background(30);
    const count = this.deviceManager.getDeviceCount();
    text(`Devices: ${count}`, 10, 20);
  }
}
```

2. Include it in `socket-demo/index.html` before `sketch.js`:

```html
<script src="scenes/MyScene.js"></script>
```

3. Register it in `socket-demo/sketch.js`:

```js
gameStateManager.addScene('my', new MyScene(deviceManager));
```

4. Switch to it from code or console:

```js
gameStateManager.switchTo('my');
```
