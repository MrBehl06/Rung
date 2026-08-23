/**
 * Regenerate the home-page screenshots.
 *
 *   npm run dev                                  (in another shell)
 *   chrome --headless=new --remote-debugging-port=9222
 *   node scripts/shots.mjs [port]
 *
 * Screenshots go stale whenever the UI changes — re-run this after visual work.
 * Captured at 2x and written as WebP so they stay sharp without the weight.
 */
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const PORT = process.argv[2] || '5173';
const OUT = 'public/shots';
const W = 1280;
const tmp = mkdtempSync(join(tmpdir(), 'rung-shots-'));

const tgt = await (await fetch('http://localhost:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) =>
  new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await send('Page.enable');
await send('Runtime.enable');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const js = (expression) => send('Runtime.evaluate', { expression });
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const now = Date.now();

const hist = {};
for (let i = 0; i < 26; i++) { if (i % 5 === 3) continue; hist[iso(now - i * 864e5)] = 1 + (i % 3); }

const SEED = `(() => {
  const s = JSON.parse(localStorage.getItem('hld-lld-tracker/v1'));
  s.joinedSprints = ['hld','lld','blind75'];
  s.history = ${JSON.stringify(hist)};
  s.ui.theme = 'light';
  s.dayNotes = { '${iso(now)}': { text: 'revise CAP + PACELC\\n- finish sharding notes\\n- redo rate limiter LLD\\n- mock interview 7pm', checked: [1] } };
  const star = ['CAP Theorem','Sharding','Consistent Hashing','Observer','Two Sum','Coin Change'];
  const done = ['Scalability','Latency vs Throughput','Availability & Reliability','DNS','Load Balancer','CDN','SOLID Principles','Factory','Decorator','Two Sum'];
  s.topics.forEach(t => {
    if (star.includes(t.name)) t.bookmarked = true;
    if (done.includes(t.name)) { t.status = 'Completed'; t.dateCompleted = '${iso(now)}'; t.srStep = 1; t.srDue = '${iso(now - 864e5)}'; }
    if (t.name === 'CAP Theorem') {
      t.notes = 'PACELC is the follow-up — latency versus consistency even when nothing is partitioned.';
      t.links = [
        { id:'a', url:'https://martinfowler.com/articles/', label:'CAP FAQ' },
        { id:'b', url:'https://www.youtube.com/watch', label:'CAP in 10 minutes' },
        { id:'c', url:'https://dataintensive.net/', label:'DDIA chapter 9' },
      ];
      t.status = 'Needs Revision'; t.srDue = '${iso(now - 864e5)}'; t.revisionCount = 2;
    }
    if (t.name === 'Sharding') { t.status = 'In Progress'; t.dateStarted = '${iso(now)}'; }
  });
  localStorage.setItem('hld-lld-tracker/v1', JSON.stringify(s));
})()`;

/** Reset filters too — a stale filter from a previous capture renders an empty list. */
const setView = (view, sprint = 'hld') =>
  js(`(()=>{const s=JSON.parse(localStorage.getItem('hld-lld-tracker/v1'));
      s.ui.view='${view}'; s.ui.activeSprint='${sprint}';
      s.ui.filters={ q:'', sprint:'${view}'==='sprint'?'${sprint}':'all', saved:false,
                     category:'all', status:'all', difficulty:'all' };
      s.ui.collapsed={};
      localStorage.setItem('hld-lld-tracker/v1',JSON.stringify(s));})()`);

async function capture(name, height, cropLeft = 0) {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height, deviceScaleFactor: 2, mobile: false });
  await wait(650);
  const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const raw = join(tmp, `${name}.png`);
  writeFileSync(raw, Buffer.from(res.data, 'base64'));
  execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(raw)}).convert('RGB')
im = im.crop((int(im.width * ${cropLeft}), 0, im.width, min(im.height, ${height * 2})))
im = im.resize((int(im.width * 0.75), int(im.height * 0.75)), Image.LANCZOS)
im.save(${JSON.stringify(`${OUT}/${name}.webp`)}, 'WEBP', quality=82, method=6)
`]);
  console.log('  ', name);
}

// boot + seed
await send('Page.navigate', { url: `http://localhost:${PORT}/app` });
await wait(2600);
await js(SEED);

/** [file, view, height, click-after-load, crop-from-left as a fraction] */
const SHOTS = [
  ['sprints',   'sprints',  700, null, 0],
  ['sprint',    'sprint',   820, null, 0],
  ['review',    'revision', 680, null, 0],
  ['calendar',  'calendar', 700, null, 0],
  ['saved',     'saved',    660, null, 0],
  ['resources', 'sprint',   740, null, 0.56],
];

console.log('capturing…');
for (const [name, view, h, click, crop] of SHOTS) {
  await setView(view);
  await send('Page.reload');
  await wait(2600);
  if (name === 'resources') {
    await js(`(()=>{const b=[...document.querySelectorAll('.tcard-name')].find(x=>x.textContent.includes('CAP Theorem')); if(b) b.click();})()`);
    await wait(900);
    // scroll the drawer so the Resources block, not the status block, is the subject
    await js(`(()=>{const el=document.querySelector('.drawer .body'); if(el) el.scrollTop = 300;})()`);
    await wait(500);
  } else if (click) {
    await js(`(()=>{const el=document.querySelector(${JSON.stringify(click)}); if(el) el.click();})()`);
    await wait(900);
  }
  await capture(name, h, crop);
}

await fetch('http://localhost:9222/json/close/' + tgt.id);
ws.close();
console.log('done →', OUT);
process.exit(0);
