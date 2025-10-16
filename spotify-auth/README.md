# spotify-auth

Flask OAuth server for Spotify Authorization Code flow, backing the Web Playback SDK in `socket-demo`.

## Endpoints
- GET `/login`: Start Spotify OAuth (scopes: streaming, user-read-email, user-read-private, user-modify-playback-state, user-read-playback-state)
- GET `/callback`: Token exchange and session creation
- GET `/access_token`: Returns short-lived access token (refreshes automatically)
- POST `/logout`: Clears session
- GET `/health`: Liveness

## Environment
Create `.env` (or pass via compose):

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
# Local
SPOTIFY_REDIRECT_URI=http://localhost:5180/callback
FRONTEND_ORIGIN=http://localhost:8080
COOKIE_DOMAIN=localhost
SESSION_SECRET=

# Production
# SPOTIFY_REDIRECT_URI=https://oauth.hitloop.<hostname>/callback
# FRONTEND_ORIGIN=https://<frontend-hostname>
# COOKIE_DOMAIN=.<hostname>
```

Update Redirect URIs in Spotify Dashboard for both local and prod.

## Docker
Built via root `docker-compose.yml` service `spotify-auth`.
- Container listens on 8000; host port 5180 in compose.
- Reverse proxy `oauth.hitloop.<hostname>` → `http://<docker-host>:5180`
- Enable SSL and forward `X-Forwarded-Proto: https`.

## Notes
- Sessions are in-memory; use Redis/DB for multi-instance.
- Cookies: httpOnly, SameSite=Lax, Secure when behind HTTPS.

