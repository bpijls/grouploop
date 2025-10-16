class Scene {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
        this.showDebugText = false;
        this.spotifyTrackUri = null; // override in scenes to enable music
        this.spotifyVolume = 50; // 0-100
    }

    setup() {}

    draw() {}

    drawDebugText() {
        // Override this method in subclasses to draw debug information
    }

    toggleDebugText() {
        this.showDebugText = !this.showDebugText;
    }

    keyPressed() {
        if (key === 'd' || key === 'D') {
            this.toggleDebugText();
        }
    }

    async onEnter() {
        if (this.spotifyTrackUri && window.SpotifyController) {
            try {
                await window.SpotifyController.playTrackLoop(this.spotifyTrackUri, this.spotifyVolume);
            } catch (e) {
                console.warn('Spotify play failed', e);
            }
        }
    }

    async onExit() {
        if (window.SpotifyController) {
            try { await window.SpotifyController.stop(); } catch (e) {}
        }
    }
}



