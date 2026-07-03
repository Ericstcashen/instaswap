import express from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.INSTASWAP_DATA_DIR || join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'db.json');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ---- tiny JSON store (fine for prototype volume) ----
let db = { hosts: {}, swaps: [] };
if (existsSync(DB_FILE)) {
  try { db = JSON.parse(readFileSync(DB_FILE, 'utf8')); } catch { /* start fresh */ }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch (e) { console.error('save failed', e); }
  }, 40);
}

// ---- helpers ----
const shortId = () => randomBytes(5).toString('hex');            // public code, 10 chars
const secret = () => randomBytes(24).toString('base64url');      // host dashboard token
const clean = (v) => String(v || '').trim().replace(/^@+/, '').toLowerCase();
const validHandle = (h) => /^[a-z0-9._]{1,30}$/.test(h);

function authHost(req, res) {
  const tok = req.get('x-host-token');
  const host = tok && Object.values(db.hosts).find((h) => h.token === tok);
  if (!host) { res.status(401).json({ error: 'unauthorized' }); return null; }
  return host;
}

// ---- app ----
const app = express();
app.use(express.json());

// CORS for /api so a native (Capacitor) app can call the backend cross-origin.
// Token is a custom header (not a cookie), so wildcard origin is safe here.
app.use('/api', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-host-token');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(join(__dirname, 'public')));

// health check for the platform load balancer
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// create a host code
app.post('/api/hosts', (req, res) => {
  const handle = clean(req.body?.handle);
  if (!validHandle(handle)) return res.status(400).json({ error: 'invalid handle' });
  const id = shortId();
  const token = secret();
  db.hosts[id] = { id, handle, token, createdAt: Date.now() };
  save();
  res.json({ id, token, handle });
});

// public lookup so the guest page can show who they're swapping with
app.get('/api/hosts/:id', (req, res) => {
  const h = db.hosts[req.params.id];
  if (!h) return res.status(404).json({ error: 'not found' });
  res.json({ id: h.id, handle: h.handle });
});

// guest submits a swap
app.post('/api/swaps', (req, res) => {
  const hostId = String(req.body?.hostId || '');
  const guest = clean(req.body?.guest);
  const host = db.hosts[hostId];
  if (!host) return res.status(404).json({ error: 'unknown code' });
  if (!validHandle(guest)) return res.status(400).json({ error: 'invalid handle' });
  const existing = db.swaps.find((s) => s.hostId === hostId && s.guest === guest);
  if (existing) existing.createdAt = Date.now();
  else db.swaps.push({ id: randomUUID(), hostId, guest, followed: false, createdAt: Date.now() });
  save();
  res.json({ ok: true, host: host.handle });
});

// host views their collected handles
app.get('/api/swaps', (req, res) => {
  const host = authHost(req, res); if (!host) return;
  const swaps = db.swaps
    .filter((s) => s.hostId === host.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => ({ id: s.id, guest: s.guest, followed: s.followed, createdAt: s.createdAt }));
  res.json({ id: host.id, handle: host.handle, swaps });
});

// mark a swap followed / unfollowed
app.post('/api/swaps/:id/followed', (req, res) => {
  const host = authHost(req, res); if (!host) return;
  const s = db.swaps.find((x) => x.id === req.params.id && x.hostId === host.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  s.followed = !!req.body?.followed;
  save();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`InstaSwap → http://localhost:${PORT}`));
