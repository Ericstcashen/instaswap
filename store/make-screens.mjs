// Generates 4 App Store screenshot pages (real app UI, baked content) into
// store/screens/. Rendered to PNG by headless Chrome at 440x956 @3x = 1320x2868 (6.9").
import QRCode from 'qrcode';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'public', 'style.css'), 'utf8');
const qrSvg = await QRCode.toString('https://instaswap.onrender.com/?u=eric', {
  type: 'svg', margin: 1, color: { dark: '#0b0b0f', light: '#ffffff' }
});

const page = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8">
<style>${css}
html,body{width:428px;height:926px;overflow:hidden}
${extra}</style></head><body>${body}</body></html>`;

const brand = `<div class="brand"><div class="logo"></div><b>Swaply</b></div>`;

// 1 — Home
const home = page(`<div class="card">${brand}
  <h1>Trade Instagrams in one scan.</h1>
  <p class="sub">Set your handle once. Show your code. They scan, tap, and you've both got each other — no spelling it out.</p>
  <div class="field"><span class="at">@</span><input type="text" value="eric.builds"></div>
  <div class="err"></div>
  <button class="btn">Create my code</button>
  <div class="foot">Your handle stays on your phone except the one swap you send.</div>
</div>`);

// 2 — Your code (QR)
const code = page(`<div class="card">${brand}
  <h1 style="margin-bottom:14px">Point your code at them 👇</h1>
  <div class="qrwrap"><div style="width:230px">${qrSvg}</div></div>
  <div class="linkrow"><input type="text" value="swaply.app/?u=eric" readonly><button class="copybtn">Copy</button></div>
  <a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:6px">View your swaps →</a>
  <button class="btn secondary">Scan someone's code 📷</button>
</div>`, `.qrwrap svg{display:block;width:100%;height:auto}`);

// 3 — Scanning (camera pointed at a code)
const scan = page(`<div class="scan-overlay" style="position:static;height:956px">
  <div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 30%, #2a2a33 0%, #050507 80%)"></div>
  <div class="scan-mask">
    <div class="scan-frame" style="display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 100vmax rgba(0,0,0,.55)">
      <div style="width:74%;background:#fff;border-radius:12px;padding:8px">${qrSvg}</div>
    </div>
    <div class="scan-hint">Point at a friend's Swaply code</div>
  </div>
  <button class="btn secondary scan-cancel">Cancel</button>
</div>`, `.scan-frame svg{display:block;width:100%;height:auto}`);

// 4 — Dashboard
const rows = [
  ['jordan.m', 'just now', false],
  ['sofia_rae', '2m ago', false],
  ['marcus.k', '11m ago', true],
  ['priya.patel', '1h ago', false],
  ['dylan99', '3h ago', true],
].map(([h, t, done]) => `<div class="row${done ? ' done' : ''}">
  <div class="av">${h[0].toUpperCase()}</div>
  <div class="meta"><div class="name">@${h}</div><div class="time">${t}</div></div>
  <button class="open">Follow</button>
  <label class="chk"><input type="checkbox"${done ? ' checked' : ''}>done</label>
</div>`).join('');

const dash = page(`<div class="card">${brand}
  <div class="dhead"><h1>Your swaps</h1><span class="count">5 swaps</span></div>
  <p class="dsub">People who swapped with @eric.builds</p>
  <div class="toolbar"><a>＋ Show my code</a><button>↻ Refresh</button></div>
  <div class="list">${rows}</div>
</div>`);

const files = { '1_home': home, '2_code': code, '3_scan': scan, '4_dashboard': dash };
for (const [name, html] of Object.entries(files)) {
  writeFileSync(join(root, 'store', 'screens', name + '.html'), html);
  console.log('wrote store/screens/' + name + '.html');
}
