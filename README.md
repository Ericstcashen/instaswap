# Swaply

Trade Instagram handles in one scan. One person shows a QR/link; the other types
their handle once, and it lands in the host's **own dashboard** with a one-tap
follow — no spelling usernames out loud, no third-party form service.

Self-hosted: your own Node server + local storage. 

## Run it locally

```
npm install
npm start            # http://localhost:3000  (or npm run dev to auto-reload)
```

Open `http://localhost:3000`, set your handle, and you'll get a QR + link.
To test the guest side, open the link on your phone (same Wi-Fi) or in a second
browser profile.

## How it works

- **Host setup** (`/`): enter your @handle → `POST /api/hosts` mints a public code
  + a private token (saved in your browser). You get a QR + link `/?u=<code>`.
- **Guest connect** (`/?u=<code>`): the scanner types their handle → `POST /api/swaps`.
  They get a one-tap "Open on Instagram" deep link to follow you back.
- **Dashboard** (`/dashboard.html`): reads your private token, lists everyone who
  swapped, newest first — tap **Follow** to deep-link into their profile, check
  **done** to mark them. Auto-refreshes every 15s.
- **Remembered handle**: each phone remembers its owner's handle, so repeat swaps
  are one tap.
- **Growth loop**: after swapping, the guest is offered their own code.

### Storage

A single JSON file at `data/db.json` (override with `INSTASWAP_DATA_DIR`).
Fine for prototype volume. Swap it for SQLite/Postgres when you outgrow it — the
store is isolated in `server.js`.

## Deploy (anywhere that runs Node — not Netlify)

Any host with a persistent disk works: **Render, Railway, Fly.io, a VPS.**

- **Render / Railway:** point at this repo, build `npm install`, start `npm start`.
  Attach a persistent disk and set `INSTASWAP_DATA_DIR` to a path on it so swaps
  survive redeploys.
- **Fly.io:** `fly launch` → add a volume → mount it and set `INSTASWAP_DATA_DIR`.
- **VPS:** `npm ci && npm start` behind nginx/Caddy; run under systemd or pm2.

> Serverless/static hosts (Netlify, Vercel functions) don't keep a writable disk
> between requests, so the JSON store won't persist there — use a Node host with a
> volume, or move storage to a managed DB first.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/hosts` | — | create a host code → `{id, token, handle}` |
| GET | `/api/hosts/:id` | — | public host lookup (guest page) |
| POST | `/api/swaps` | — | guest submits `{hostId, guest}` |
| GET | `/api/swaps` | `x-host-token` | host's collected swaps |
| POST | `/api/swaps/:id/followed` | `x-host-token` | toggle followed |

## Known limits (prototype)

- Instagram's API can't auto-follow, so the last step is a one-tap deep link to the
  profile — the fastest thing allowed within IG's rules.
- Handles are validated by format only. A live "does this account exist?" check
  needs a small server-side lookup (Instagram blocks browser CORS) — easy next step
  since we now have a backend.
- The host token lives in the browser's localStorage; clearing it loses dashboard
  access to that code. Add real accounts/login when you go past prototype.
