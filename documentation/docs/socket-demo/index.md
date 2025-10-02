# Socket Demo

This section documents the code structure and extension points of the socket-demo.

- Classes: `GameState`, `GameStateManager`, `HitloopDevice`, `HitloopDeviceManager`
- How-tos: read device state, add a new GameState

## Architecture

- WebSocket messages are parsed into `HitloopDevice` instances managed by `HitloopDeviceManager`.
- The draw loop delegates to a `GameStateManager` that renders the active `GameState`.
- Game states are modular files under `socket-demo/gamestates/`.
