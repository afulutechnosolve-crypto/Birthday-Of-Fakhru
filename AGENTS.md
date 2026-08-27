# Base44 Dev Environment

## What this is
A static birthday website — vanilla HTML/CSS/JS, no build step, no backend, no dependencies, no secrets.

## How it runs
Served by `nginx:alpine` via `docker-compose.base44.yml` on host port 3000 (container port 80). The repo root is bind-mounted read-only into nginx's html dir, so edits appear on reload.

## Verify it works
- `docker compose -f docker-compose.base44.yml up -d`
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` returns the HTML.
- Preview shows the "Chapter 31" boot screen; click START to walk through the scenes.

## Notes
- No live-reload dev server (static files). Call `reload_preview` after edits so the user sees changes.
- No tests, no migrations, no seeds.
