// Minimal Spotify Web Playback integration
// Exposes a singleton to initialize the player and control playback via Web API

const SpotifyController = (() => {
    let deviceId = null;
    let player = null;
    let tokenCache = { token: null, expiresAt: 0 };
    const OAUTH_BASE = (window.SPOTIFY_OAUTH_BASE || 'http://localhost:5180');

    async function fetchAccessToken() {
        const now = Date.now() / 1000;
        if (tokenCache.token && tokenCache.expiresAt > now + 10) {
            return tokenCache.token;
        }
        const resp = await fetch(`${OAUTH_BASE}/access_token`, { credentials: 'include' });
        if (!resp.ok) throw new Error('access_token_failed');
        const data = await resp.json();
        tokenCache.token = data.access_token;
        tokenCache.expiresAt = data.expires_at;
        return tokenCache.token;
    }

    async function ensurePlayer() {
        if (player) return player;
        // Wait for SDK to be ready
        await new Promise((resolve) => {
            if (window.Spotify) return resolve();
            window.onSpotifyWebPlaybackSDKReady = resolve;
        });
        const token = await fetchAccessToken();
        player = new Spotify.Player({
            name: 'Hitloop Web Player',
            getOAuthToken: async cb => {
                try {
                    const t = await fetchAccessToken();
                    cb(t);
                } catch (e) {
                    console.error('token error', e);
                }
            },
            volume: 0.5,
        });

        player.addListener('ready', ({ device_id }) => {
            deviceId = device_id;
            console.log('Spotify Player ready', device_id);
        });
        player.addListener('not_ready', ({ device_id }) => {
            console.warn('Spotify Player not ready', device_id);
        });
        player.addListener('initialization_error', ({ message }) => console.error(message));
        player.addListener('authentication_error', ({ message }) => console.error(message));
        player.addListener('account_error', ({ message }) => console.error(message));

        await player.connect();
        return player;
    }

    async function transferPlaybackHere() {
        if (!deviceId) return;
        const token = await fetchAccessToken();
        await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_ids: [deviceId], play: false })
        });
    }

    async function playTrackLoop(trackUri, volumePct = 50) {
        await ensurePlayer();
        if (!deviceId) throw new Error('device_not_ready');
        await transferPlaybackHere();
        const token = await fetchAccessToken();
        // set volume first
        await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePct}&device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        // play single track
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [trackUri] })
        });
        // set repeat to track
        await fetch(`https://api.spotify.com/v1/me/player/repeat?state=track&device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async function stop() {
        if (!deviceId) return;
        const token = await fetchAccessToken();
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    return { ensurePlayer, playTrackLoop, stop };
})();

window.SpotifyController = SpotifyController;

