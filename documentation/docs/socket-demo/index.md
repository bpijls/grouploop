# Socket Demo

This section describes the architecture and extension points of the socket-demo.

## Sensor data protocol

Each sample is a single line, ASCII hex, 18 hex chars total, then a newline:

```
id(4) aX(2) aY(2) aZ(2) rssiNW(2) rssiNE(2) rssiSW(2) rssiSE(2)\n
```

- `id`: 2-byte device ID (last two bytes of MAC), big-endian, printed as 4 hex chars
- `aX aY aZ`: accelerometer bytes (encoding 0..255; 128 ≈ 0 g)
- `rssi*`: beacon RSSI bytes (0..255). If unknown, devices may send FF.

Example: `0D4A80A27FFF00010203\n`

## Command protocol quick reference

- `L\n` list connected device IDs (one per line)
- `I\n` request IDs from all devices
- `C<id><RR><GG><BB>\n` set LED color on `<id>`
- `M<id><SS><TT>\n` vibrate motor on `<id>` with strength `SS` for `TT` ticks
- `R<id>\n` one-shot sensor sample from `<id>`
- `R<id><FF>\n` stream samples at `FF` Hz from `<id>`; `00` stops

- Scenes: `Scene` base class and concrete scenes under `socket-demo/scenes/`
- Manager: `SceneManager` orchestrates which scene is active
- Devices: `HitloopDevice` and `HitloopDeviceManager` (served via CDN) handle device data over WebSocket
- How-tos: read device state, add a new Scene

## Architecture

- WebSocket messages are handled by `HitloopDeviceManager`, which maintains a map of `HitloopDevice` objects keyed by device id.
- The p5 draw loop delegates to a `SceneManager` that calls `draw()` on the active `Scene`.
- Scenes are modular files under `socket-demo/scenes/` and extend the `Scene` base class.
- Navigation between scenes is provided by `SceneManager.nextScene()` and `SceneManager.previousScene()`; the demo maps these to the right/left arrow keys.

### File layout

- `socket-demo/index.html`: includes p5 libraries, shared device classes from the CDN, local `Scene.js`, `SceneManager.js`, your scene files, and `sketch.js`.
- `socket-demo/sketch.js`: wires up the `HitloopDeviceManager` (WebSocket URL), registers scenes with `SceneManager`, connects, and starts the default scene.
- `socket-demo/Scene.js`: minimal base class providing `setup()` and `draw()` plus access to the `deviceManager`.
- `socket-demo/SceneManager.js`: manages scene registration, switching, and ordered traversal.
- `socket-demo/scenes/*.js`: concrete scenes such as `DeviceListScene`, `FirstDeviceDetailsScene`, `GridHeatmapScene`.

### Shared files via CDN

The demo relies on shared libraries delivered by a CDN:

- `p5.min.js`, `p5.sound.min.js`
- `HitloopDevice.js`, `HitloopDeviceManager.js`

They are referenced in `index.html` like:

```html
<script src="http://cdn.hitloop.feib.nl/js/p5.min.js"></script>
<script src="http://cdn.hitloop.feib.nl/js/p5.sound.min.js"></script>
<script src="http://cdn.hitloop.feib.nl/js/HitloopDevice.js"></script>
<script src="http://cdn.hitloop.feib.nl/js/HitloopDeviceManager.js"></script>
```

These CDN files are served by the `cdn-server` service in this repository and kept consistent across demos.
