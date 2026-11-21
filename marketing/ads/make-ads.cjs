// Renders the NexaScan Facebook / Instagram ad creatives into marketing/ads/out/.
// Each ad is one HTML composition laid out for 1:1 (1080x1080 feed), 4:5 (1080x1350 feed) and 9:16 (1080x1920
// Stories and Reels). Stills are screenshots of the finished frame; videos are stepped frame by frame through the
// page's CSS animations, then encoded with ffmpeg (H.264, 30 fps, silent).
// Run: node marketing/ads/make-ads.cjs            (everything)
//      node marketing/ads/make-ads.cjs stills     (images only)
// Claims follow docs/ADS-AND-CAMPAIGNS.md: "finds personal details for you to review", "done on your phone",
// "nothing is uploaded"; Smart Redact is Pro. Documents shown are the site's fictional samples.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const out = path.join(__dirname, 'out');
const f = (p) => 'file://' + path.join(root, p);
const FPS = 30;
const SIZES = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] };

const css = `
@font-face { font-family: Manrope; src: url('${f('assets/fonts/manrope-latin-wght.woff2')}') format('woff2'); font-weight: 200 800; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1080px; height: var(--h); overflow: hidden; }
body { font-family: Manrope, sans-serif; color: #fff; background: #01121F; -webkit-font-smoothing: antialiased; }
.frame { position: relative; width: 1080px; height: var(--h); display: flex; flex-direction: column; padding: 72px 76px 64px;
  background: radial-gradient(900px 700px at 85% 10%, rgba(29,172,160,.35), transparent 60%),
              radial-gradient(800px 800px at 0% 100%, rgba(15,148,134,.25), transparent 60%), linear-gradient(170deg, #011F36, #01121F 70%); }
.story .frame { padding: 230px 76px 330px; }   /* keep clear of the Stories header and reply bar */
.light .frame { background: radial-gradient(900px 700px at 90% 0%, rgba(63,214,196,.30), transparent 60%), linear-gradient(170deg, #F3FAF9, #E1F5F2); color: #0B1D2B; }
.brand { display: flex; align-items: center; gap: 16px; font-weight: 800; font-size: 34px; letter-spacing: -.01em; }
.brand img { width: 56px; height: 56px; border-radius: 14px; }
.brand span { color: #3FD6C4; } .light .brand span { color: #0F9486; }
.eyebrow { font-size: 26px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #3FD6C4; margin-top: 40px; }
.light .eyebrow { color: #0E766D; }
h1 { font-size: 84px; line-height: .98; font-weight: 800; letter-spacing: -.035em; margin-top: 18px; text-wrap: balance; }
.square h1 { font-size: 72px; }
h1 em { font-style: normal; color: #3FD6C4; } .light h1 em { color: #0F9486; }
.sub { font-size: 32px; line-height: 1.35; color: #C9D8E3; margin-top: 22px; max-width: 900px; font-weight: 500; }
.light .sub { color: #4A5D6B; }
.square .sub { font-size: 28px; margin-top: 16px; }
.visual { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; margin: 36px 0; }
.cta { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.pill { display: inline-flex; align-items: center; gap: 14px; background: #3FD6C4; color: #01121F; font-weight: 800; font-size: 32px;
  padding: 22px 36px; border-radius: 999px; box-shadow: 0 18px 40px -12px rgba(63,214,196,.55); }
.light .pill { background: #0B1D2B; color: #fff; box-shadow: 0 18px 40px -12px rgba(1,31,54,.5); }
.pill svg { width: 34px; height: 34px; }
.fine { font-size: 22px; color: #8FA8B8; font-weight: 600; text-align: right; line-height: 1.35; }
.light .fine { color: #4A5D6B; }
.tag { display: inline-block; font-size: 20px; font-weight: 800; letter-spacing: .06em; padding: 6px 14px; border-radius: 999px; background: #FFF4D6; color: #8A5A00; vertical-align: middle; }
.phone { border-radius: 54px; padding: 14px; background: #0B1D2B; box-shadow: 0 0 0 2px rgba(255,255,255,.08), 0 50px 90px -30px rgba(0,0,0,.8); }
.phone img { display: block; border-radius: 42px; height: 100%; width: auto; }
.chip { position: absolute; display: flex; align-items: center; gap: 12px; background: #fff; color: #0B1D2B; font-weight: 800; font-size: 26px;
  padding: 16px 24px; border-radius: 999px; box-shadow: 0 20px 40px -14px rgba(0,0,0,.55); white-space: nowrap; }
.chip i { width: 30px; height: 30px; border-radius: 50%; background: #0F9486; display: grid; place-items: center; color: #fff; font-style: normal; font-size: 18px; }
/* end card (videos only) */
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; text-align: center;
  background: linear-gradient(170deg, #011F36, #01121F); opacity: 0; }
.end img { width: 190px; height: 190px; border-radius: 44px; box-shadow: 0 30px 60px -20px rgba(63,214,196,.5); }
.end b { font-size: 92px; font-weight: 800; letter-spacing: -.03em; } .end b span { color: #3FD6C4; }
.end p { font-size: 40px; color: #C9D8E3; font-weight: 600; }
.end .pill { margin-top: 20px; font-size: 38px; }
.end small { font-size: 26px; color: #8FA8B8; font-weight: 600; }
@keyframes up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { 0% { opacity: 0; transform: scale(.6); } 70% { transform: scale(1.06); } 100% { opacity: 1; transform: none; } }
.a { animation: up .7s cubic-bezier(.2,.8,.2,1) both; }
`;

const appleIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-3.9zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>';
const brand = (light) => `<div class="brand a"><img src="${f('assets/brand/nexascan-logo.png')}" alt="">Nexa<span>Scan</span></div>`;
const cta = (delay = 0) => `<div class="cta a" style="animation-delay:${delay}s"><span class="pill">${appleIcon}Free on the App Store</span><span class="fine">iPhone · iPad · Mac<br>Nothing is uploaded</span></div>`;
const endCard = (at) => `<div class="end" style="animation: fade .6s ease ${at}s both"><img src="${f('assets/brand/nexascan-logo.png')}" alt=""><b>Nexa<span>Scan</span></b><p>AI Scan, Edit &amp; Redact</p><span class="pill">${appleIcon}Free on the App Store</span><small>iPhone · iPad · Mac · Done on your device</small></div>`;

// ---------------------------------------------------------------------------------------------------------------
// Compositions. Each returns the inner HTML for a size; `video` adds the end card at the given second.
const payslip = (t0) => {
  const rows = [['Employee', 'Jordan Ellison', 'Name'], ['Address', '14 Quayside Walk, Sample City', 'Address'],
    ['NI number', 'QQ 12 34 56 C', 'ID number'], ['Role', 'Interior designer', ''], ['Paid to', 'Sort code 00-00-00 · 12345678', 'Bank details']];
  let i = 0;
  return `<div class="slip a" style="animation-delay:${t0}s">
    <div class="slip-head"><b>Harbour &amp; Pine Interiors</b><span>Payslip · October</span></div>
    ${rows.map(([k, v, label]) => {
      if (!label) return `<p><b>${k}</b><span>${v}</span></p>`;
      const d = t0 + 1.2 + i * 0.45; const h = t0 + 3.4 + i * 0.25; i++;
      return `<p><b>${k}</b><span class="hit"><span class="ring" style="animation-delay:${d}s"></span><span class="lab" style="animation-delay:${d}s">${label}</span><span class="box" style="animation-delay:${h}s"></span>${v}</span></p>`;
    }).join('')}
    <p class="total"><b>Net pay</b><span>£2,140.00</span></p>
    <span class="beam" style="animation-delay:${t0 + .3}s"></span>
    <span class="chip done" style="animation-delay:${t0 + 4.8}s"><i>✓</i>4 details hidden</span>
  </div>`;
};
const slipCss = `
.slip { position: relative; width: 860px; background: #fff; color: #0B1D2B; border-radius: 28px; padding: 46px 50px 54px; box-shadow: 0 60px 100px -40px rgba(0,0,0,.8); }
.square .slip { zoom: .62; } .portrait .slip { zoom: .9; } .story .slip { zoom: 1.08; }
.slip-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #0B1D2B; padding-bottom: 20px; margin-bottom: 18px; }
.slip-head b { font-size: 38px; letter-spacing: -.02em; } .slip-head span { font-size: 24px; color: #4A5D6B; font-weight: 700; }
.slip p { display: flex; gap: 26px; font-size: 30px; padding: 16px 0; border-bottom: 1px solid #DCE6E6; align-items: center; }
.slip p b { width: 190px; flex: none; color: #4A5D6B; font-weight: 700; font-size: 26px; }
.slip p.total { border: 0; font-weight: 800; } .slip p.total span { font-size: 36px; }
.hit { position: relative; font-weight: 600; }
.ring { position: absolute; inset: -8px -12px; border: 4px solid #1DACA0; border-radius: 10px; background: rgba(63,214,196,.14); animation: fade .3s both; }
.lab { position: absolute; right: -12px; top: -30px; font-size: 17px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; background: #0F9486; color: #fff; padding: 4px 10px; border-radius: 6px; animation: fade .3s both; }
.box { position: absolute; inset: -6px -10px; background: #0B1D2B; border-radius: 6px; transform-origin: left; animation: wipe .45s cubic-bezier(.6,0,.2,1) both; z-index: 2; }
@keyframes wipe { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.beam { position: absolute; left: 0; right: 0; top: 0; height: 120px; background: linear-gradient(180deg, transparent, rgba(63,214,196,.45) 70%, #3FD6C4 72%, transparent 74%); animation: beam 1.3s ease-in-out both; opacity: 0; pointer-events: none; }
@keyframes beam { 0% { opacity: 0; transform: translateY(-40px); } 10% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; transform: translateY(720px); } }
.chip.done { right: -30px; bottom: -36px; animation: pop .5s both; }
`;

const comps = {
  redact: {
    duration: 10, endAt: 7.4, still: 7,
    css: slipCss,
    html: (size, video) => `<div class="frame">${brand()}
      <p class="eyebrow a" style="animation-delay:.1s">Smart Redact <span class="tag">PRO</span></p>
      <h1 class="a" style="animation-delay:.2s">Sending a payslip? <em>Hide the private bits first.</em></h1>
      ${size === 'square' ? '' : '<p class="sub a" style="animation-delay:.35s">NexaScan finds names, addresses, account and ID numbers for you to review, then hides them for real. Done on your phone.</p>'}
      <div class="visual">${payslip(.6)}</div>${cta(.5)}${video ? endCard(7.4) : ''}</div>`,
  },
  edit: {
    duration: 9, endAt: 6.6, still: 6.2,
    css: `.visual .phone { height: 100%; max-height: 1000px; } .square .visual .phone { max-height: 560px; }
      .chips { position: absolute; inset: 0; }
      .c1 { left: 0; top: 14%; } .c2 { right: 0; top: 30%; } .c3 { left: 2%; top: 56%; } .c4 { right: 2%; top: 74%; }
      .square .c1 { left: 40px; } .square .c3 { left: 40px; }
      .chip { animation: pop .5s both; }`,
    html: (size, video) => `<div class="frame">${brand()}
      <p class="eyebrow a" style="animation-delay:.1s">PDF editor</p>
      <h1 class="a" style="animation-delay:.2s">Edit any PDF. <em>Right on your phone.</em></h1>
      ${size === 'square' ? '' : '<p class="sub a" style="animation-delay:.35s">Sign it, fill it in, mark it up. Every edit is saved as a new copy, and your original stays as it was.</p>'}
      <div class="visual"><div class="phone a" style="animation-delay:.6s"><img src="${f('assets/screenshots/edit-pdf.webp')}" alt=""></div>
        <div class="chips">
          <span class="chip c1" style="animation-delay:1.4s"><i>✍</i>Sign any page</span>
          <span class="chip c2" style="animation-delay:2.2s"><i>T</i>Add text</span>
          <span class="chip c3" style="animation-delay:3.0s"><i>✓</i>Tick, cross or date</span>
          <span class="chip c4" style="animation-delay:3.8s"><i>◎</i>Shapes, arrows, watermarks</span>
        </div></div>${cta(.5)}${video ? endCard(6.6) : ''}</div>`,
  },
  restore: {
    duration: 9, endAt: 6.6, still: 6.2,
    css: beforeAfterCss(),
    html: (size, video) => `<div class="frame">${brand()}
      <p class="eyebrow a" style="animation-delay:.1s">Nexa Magic <span class="tag">PRO</span></p>
      <h1 class="a" style="animation-delay:.2s">Creased, stained, faded? <em>Fixed in one tap.</em></h1>
      ${size === 'square' ? '' : '<p class="sub a" style="animation-delay:.35s">Folds, creases, stains and yellowed paper repaired on your phone. For old letters, receipts and family records.</p>'}
      <div class="visual">${beforeAfter('magic-before', 'magic-after', .6)}</div>${cta(.5)}${video ? endCard(6.6) : ''}</div>`,
  },
  watermark: {
    duration: 9, endAt: 6.6, still: 6.2,
    css: beforeAfterCss(),
    html: (size, video) => `<div class="frame">${brand()}
      <p class="eyebrow a" style="animation-delay:.1s">Remove Watermark <span class="tag">PRO</span></p>
      <h1 class="a" style="animation-delay:.2s">Brush once. <em>The stamp is gone.</em></h1>
      ${size === 'square' ? '' : '<p class="sub a" style="animation-delay:.35s">Similar marks across the page are found and cleaned away, and your text is kept. For your own drafts and forms.</p>'}
      <div class="visual">${beforeAfter('watermark-before', 'watermark-after', .6)}</div>${cta(.5)}${video ? endCard(6.6) : ''}</div>`,
  },
  trio: {
    duration: 11, endAt: 8.6, still: 8,
    css: slipCss + `.trio { display: flex; gap: 26px; align-items: center; height: 100%; }
      .trio > div { display: flex; flex-direction: column; align-items: center; gap: 22px; height: 100%; justify-content: center; }
      .trio .phone { height: 78%; max-height: 900px; padding: 10px; border-radius: 40px; } .trio .phone img { border-radius: 32px; }
      .trio .mini { height: 78%; max-height: 900px; aspect-ratio: 540/1094; background: #fff; border-radius: 40px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 50px 90px -30px rgba(0,0,0,.8); }
      .trio .mini .slip { zoom: .33; flex: none; box-shadow: none; }
      .square .trio .mini .slip { zoom: .25; } .story .trio .mini .slip { zoom: .37; }
      .trio .mini .chip.done { display: none; }
      .trio strong { font-size: 40px; font-weight: 800; } .trio strong span { color: #3FD6C4; }
      .square .trio strong { font-size: 32px; }`,
    html: (size, video) => `<div class="frame">${brand()}
      <p class="eyebrow a" style="animation-delay:.1s">AI Scan, Edit &amp; Redact</p>
      <h1 class="a" style="animation-delay:.2s">One app for <em>every document job.</em></h1>
      <div class="visual"><div class="trio">
        <div class="a" style="animation-delay:.7s"><div class="phone"><img src="${f('assets/screenshots/looks.webp')}" alt=""></div><strong><span>1</span> Scan</strong></div>
        <div class="a" style="animation-delay:2.2s"><div class="phone"><img src="${f('assets/screenshots/edit-pdf.webp')}" alt=""></div><strong><span>2</span> Edit</strong></div>
        <div class="a" style="animation-delay:3.7s"><div class="mini">${payslip(3.7)}</div><strong><span>3</span> Redact</strong></div>
      </div></div>${cta(.5)}${video ? endCard(8.6) : ''}</div>`,
  },
  private: {
    duration: 8, endAt: 5.6, still: 5,
    css: `.points { display: grid; gap: 26px; width: 100%; } .square .points { gap: 16px; }
      .points li { list-style: none; display: flex; align-items: center; gap: 26px; font-size: 40px; font-weight: 700; background: rgba(255,255,255,.06);
        border: 1px solid rgba(63,214,196,.25); border-radius: 26px; padding: 30px 34px; }
      .square .points li { font-size: 32px; padding: 20px 28px; }
      .points li i { flex: none; width: 60px; height: 60px; border-radius: 50%; background: #3FD6C4; color: #01121F; display: grid; place-items: center; font-style: normal; font-size: 32px; font-weight: 800; }
      .points li span { display: block; font-size: 26px; font-weight: 500; color: #9FB6C5; margin-top: 4px; } .square .points li span { font-size: 22px; }`,
    html: (size, video) => `<div class="frame">${brand()}
      <p class="eyebrow a" style="animation-delay:.1s">Private by design</p>
      <h1 class="a" style="animation-delay:.2s">Your documents <em>never leave your phone.</em></h1>
      <div class="visual"><ul class="points">
        ${[['Nothing is uploaded', 'Every tool runs on your device, even in flight mode'], ['No account', 'Open the app and start scanning'],
          ['No ads, no watermark on your files', 'Free for everyday documents'], ['Redact before you share', 'Hide names, addresses and account numbers']]
          .map(([a, b], i) => `<li class="a" style="animation-delay:${.7 + i * .6}s"><i>✓</i><div>${a}<span>${b}</span></div></li>`).join('')}
      </ul></div>${cta(.5)}${video ? endCard(5.6) : ''}</div>`,
  },
};

function beforeAfter(before, after, t0) {
  return `<div class="ba a" style="animation-delay:${t0}s">
    <img src="${f(`assets/screenshots/${before}.webp`)}" alt="">
    <div class="after" style="animation-delay:${t0 + 1.4}s"><img src="${f(`assets/screenshots/${after}.webp`)}" alt=""></div>
    <span class="handle" style="animation-delay:${t0 + 1.4}s"></span>
    <span class="lbl l1">Before</span><span class="lbl l2" style="animation-delay:${t0 + 3.2}s">After</span>
  </div>`;
}
function beforeAfterCss() {
  return `.ba { position: relative; height: 100%; max-height: 1060px; aspect-ratio: 815/1156; border-radius: 28px; overflow: hidden; box-shadow: 0 60px 100px -40px rgba(0,0,0,.8); background: #fff; }
    .ba img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .after { position: absolute; inset: 0; clip-path: inset(0 100% 0 0); animation: reveal 1.8s cubic-bezier(.6,0,.2,1) both; }
    @keyframes reveal { to { clip-path: inset(0 0 0 0); } }
    .handle { position: absolute; top: 0; bottom: 0; left: 0; width: 6px; background: #3FD6C4; box-shadow: 0 0 30px #3FD6C4; animation: slide 1.8s cubic-bezier(.6,0,.2,1) both; }
    @keyframes slide { 0% { left: 0; opacity: 1; } 95% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
    .lbl { position: absolute; top: 24px; font-size: 24px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: 10px 18px; border-radius: 999px; }
    .l1 { left: 24px; background: #0B1D2B; color: #fff; animation: fadeout .3s 2.2s both; }
    .l2 { right: 24px; background: #3FD6C4; color: #01121F; animation: fade .4s both; }
    @keyframes fadeout { to { opacity: 0; } }
    .still .after { animation: none; clip-path: inset(0 0 0 50%); } .still .handle { animation: none; left: calc(50% - 3px); opacity: 1; }
    .still .l1 { animation: none; opacity: 1; } .still .l2 { animation: none; opacity: 1; }`;
}

// Which sizes are videos (the rest are stills only).
const VIDEOS = [['redact', 'story'], ['redact', 'square'], ['edit', 'story'], ['restore', 'square'], ['restore', 'story'],
  ['watermark', 'portrait'], ['trio', 'story'], ['private', 'story']];

function doc(name, size, video) {
  const c = comps[name]; const [w, h] = SIZES[size];
  return `<!doctype html><html class="${size}${video ? '' : ' still'}"><head><meta charset="utf-8"><style>:root{--h:${h}px}${css}${c.css}</style></head>
    <body>${c.html(size, video)}</body></html>`;
}
async function seek(page, t) {
  await page.evaluate((ms) => { document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }); }, t * 1000);
}

(async () => {
  const mode = process.argv[2] || 'all';
  fs.mkdirSync(path.join(out, 'images'), { recursive: true });
  fs.mkdirSync(path.join(out, 'videos'), { recursive: true });
  const browser = await chromium.launch();
  const tmp = path.join(out, '.html'); fs.mkdirSync(tmp, { recursive: true });
  for (const name of Object.keys(comps)) {
    for (const size of Object.keys(SIZES)) {
      const [w, h] = SIZES[size];
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const file = path.join(tmp, `${name}-${size}.html`);
      fs.writeFileSync(file, doc(name, size, false));
      await page.goto('file://' + file); await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      await seek(page, comps[name].still);
      await page.screenshot({ path: path.join(out, 'images', `nexascan-${name}-${size}.jpg`), type: 'jpeg', quality: 92 });
      await page.close();
      console.log('image', name, size);
    }
  }
  if (mode !== 'stills') {
    for (const [name, size] of VIDEOS) {
      const [w, h] = SIZES[size]; const c = comps[name];
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const file = path.join(tmp, `${name}-${size}-video.html`);
      fs.writeFileSync(file, doc(name, size, true));
      await page.goto('file://' + file); await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      const frames = path.join(tmp, `${name}-${size}-frames`); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
      const n = Math.round(c.duration * FPS);
      for (let i = 0; i < n; i++) {
        await seek(page, i / FPS);
        await page.screenshot({ path: path.join(frames, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
      }
      await page.close();
      const mp4 = path.join(out, 'videos', `nexascan-${name}-${size}.mp4`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%04d.jpg'),
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '64k', mp4]);
      fs.rmSync(frames, { recursive: true, force: true });
      console.log('video', name, size);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
})();
