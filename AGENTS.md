# Base44 Dev Environment

This is a static HTML/CSS/JS birthday website (no backend, no build step).

## Running
- `docker compose -f docker-compose.base44.yml up -d`
- nginx:alpine serves the repo root at `/usr/share/nginx/html` on host port 3000.
- Source is bind-mounted read-only, so edits to `index.html`, `script.js`, `styles.css`, and `images/` are picked up on browser refresh (no rebuild needed).

## Verification
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` returns the HTML document.
- No external services or secrets are required.
