// Makes fictional demo documents for screenshot capture (never real data): photo-like "captures" of an invoice and
// a letter — greyish paper, a hand shadow, slight tilt, on a dark desk — so the app's detection and clean-up have
// something realistic to work on. Output: screenshots-raw/demo/ (gitignored).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'screenshots-raw', 'demo');
await mkdir(out, { recursive: true });

const W = 1240, H = 1754; // A4 at 150 dpi
const font = 'Segoe UI, Arial, sans-serif';
const t = (x, y, s, text, w = 400, fill = '#1d1d1d') =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${s}" font-weight="${w}" fill="${fill}">${text}</text>`;

function invoice() {
  const rows = [
    ['Interior design consultation', '2', '£85.00', '£170.00'],
    ['Room layout plan – living area', '1', '£240.00', '£240.00'],
    ['Colour and materials board', '1', '£120.00', '£120.00'],
    ['Site visit and measurements', '3', '£45.00', '£135.00'],
    ['Lighting specification', '1', '£95.00', '£95.00'],
  ];
  let y = 760, body = '';
  for (const [d, q, u, a] of rows) {
    body += t(110, y, 30, d) + t(760, y, 30, q) + t(880, y, 30, u) + t(1050, y, 30, a);
    body += `<rect x="100" y="${y + 22}" width="1040" height="1.5" fill="#bbb"/>`;
    y += 72;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#fff"/>
    ${t(100, 170, 64, 'Harbour &amp; Pine Interiors', 700, '#12423d')}
    ${t(100, 222, 28, '14 Quayside Walk · Example Town · EX1 2AB', 400, '#555')}
    ${t(900, 170, 56, 'INVOICE', 800, '#12423d')}
    ${t(100, 360, 30, 'Billed to', 700)}${t(100, 404, 30, 'Sample Customer Ltd')}${t(100, 446, 30, '1 Demo Street, Example City')}
    ${t(760, 360, 30, 'Invoice no.', 700)}${t(960, 360, 30, 'HP-2026-0417')}
    ${t(760, 404, 30, 'Date', 700)}${t(960, 404, 30, '12 Sep 2026')}
    ${t(760, 446, 30, 'Due', 700)}${t(960, 446, 30, '12 Oct 2026')}
    <rect x="100" y="640" width="1040" height="64" fill="#e8f1ef"/>
    ${t(110, 684, 28, 'Description', 700)}${t(760, 684, 28, 'Qty', 700)}${t(880, 684, 28, 'Unit', 700)}${t(1050, 684, 28, 'Amount', 700)}
    ${body}
    ${t(760, 1180, 30, 'Subtotal')}${t(1050, 1180, 30, '£760.00')}
    ${t(760, 1226, 30, 'VAT 20%')}${t(1050, 1226, 30, '£152.00')}
    <rect x="750" y="1250" width="390" height="3" fill="#12423d"/>
    ${t(760, 1302, 36, 'Total', 800)}${t(1030, 1302, 36, '£912.00', 800)}
    ${t(100, 1480, 28, 'Payment within 30 days. Thank you for your business.', 400, '#555')}
    ${t(100, 1530, 28, 'This is a fictional sample document for demonstration only.', 400, '#888')}
  </svg>`;
}

function letter() {
  const para = [
    'Thank you for visiting our studio last week. As promised, we have',
    'prepared a first proposal for the refurbishment of your reading room.',
    '',
    'The plan keeps the existing bookshelves and adds warm, indirect',
    'lighting along the ceiling. We suggest a soft sage green for the walls',
    'and oak flooring to match the window frames.',
    '',
    'Please review the attached drawings. We would be happy to discuss any',
    'changes at a time that suits you. The quotation remains valid for',
    'thirty days from the date of this letter.',
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#fff"/>
    ${t(100, 170, 56, 'Harbour &amp; Pine Interiors', 700, '#12423d')}
    ${t(100, 216, 26, '14 Quayside Walk · Example Town · EX1 2AB', 400, '#555')}
    ${t(100, 360, 30, '18 September 2026')}
    ${t(100, 460, 30, 'Dear Sample Customer,')}
    ${para.map((line, i) => t(100, 540 + i * 50, 30, line)).join('')}
    ${t(100, 1140, 30, 'Kind regards,')}
    ${t(100, 1320, 30, 'The Harbour &amp; Pine design team')}
    ${t(100, 1560, 26, 'This is a fictional sample document for demonstration only.', 400, '#888')}
  </svg>`;
}

// The letter with a large grey diagonal "DRAFT" watermark across its text, for Remove Watermark captures.
function watermarkedLetter() {
  const mark = `<text x="${W / 2}" y="${H / 2 + 60}" text-anchor="middle" font-family="${font}" font-size="300" font-weight="800"
    fill="#8e9499" fill-opacity=".38" transform="rotate(-38 ${W / 2} ${H / 2})">DRAFT</text>`;
  return letter().replace(/<\/svg>\s*$/, `${mark}</svg>`);
}

// A phone photo of the page: grey-warm paper, a soft hand shadow from one corner, tilted, on a dark desk.
async function photo(svg, name, angle) {
  const page = await sharp(Buffer.from(svg)).png().toBuffer();
  const tint = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="s" cx="100%" cy="100%" r="90%"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".55" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#b9ad96" opacity=".38"/>
    <rect width="${W}" height="${H}" fill="url(#s)"/></svg>`);
  const aged = await sharp(page).composite([{ input: tint, blend: 'multiply' }]).modulate({ brightness: 0.95 }).blur(0.6).png().toBuffer();
  const tilted = await sharp(aged).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(tilted).metadata();
  const cw = Math.round(meta.width * 1.22), ch = Math.round(meta.height * 1.16);
  const desk = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">
    <defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2f27"/><stop offset="1" stop-color="#241c17"/></linearGradient></defs>
    <rect width="${cw}" height="${ch}" fill="url(#d)"/></svg>`);
  await sharp(desk)
    .composite([{ input: tilted, left: Math.round((cw - meta.width) / 2), top: Math.round((ch - meta.height) / 2) }])
    .jpeg({ quality: 88 })
    .toFile(path.join(out, name));
}

// The letter with blue-pen notes over it (a ring round a phrase, underlines, a margin note and a tick), for Remove
// Handwriting and the scanner's No Handwriting look.
function annotatedLetter() {
  const pen = 'fill="none" stroke="#1f3fae" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".88"';
  const ink = `
    <ellipse cx="560" cy="580" rx="250" ry="36" ${pen} transform="rotate(-1.5 560 580)"/>
    <path d="M104 742 C 300 748, 520 738, 760 746" ${pen}/>
    <path d="M104 1004 C 260 1010, 420 1000, 600 1008" ${pen}/>
    <path d="M940 520 l 22 26 l 44 -60" ${pen}/>
    <text x="700" y="1200" font-family="Segoe Script, Ink Free, cursive" font-size="40" fill="#1f3fae" opacity=".9" transform="rotate(-5 700 1200)">call Tue?</text>
    <path d="M760 1150 C 720 1110, 690 1070, 660 1030" ${pen}/>
    <text x="600" y="1330" font-family="Segoe Script, Ink Free, cursive" font-size="44" fill="#1f3fae" opacity=".9" transform="rotate(-3 600 1330)">ok - J.S.</text>`;
  return letter().replace(/<\/svg>\s*$/, `${ink}</svg>`);
}

// A creased page (Nexa Magic): one vertical and one horizontal fold, each a dark valley beside a light ridge, plus a
// few soft crumple facets. Applied to the flat page before it is photographed.
function creaseOverlay() {
  const fold = (x1, y1, x2, y2, id) => `
    <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".47" stop-color="#000" stop-opacity=".16"/>
      <stop offset=".5" stop-color="#000" stop-opacity=".42"/><stop offset=".53" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    ${fold(W / 2 - 60, 0, W / 2 + 60, 0, 'v')}${fold(0, H / 2 - 50, 0, H / 2 + 50, 'h')}
    <filter id="f"><feGaussianBlur stdDeviation="40"/></filter></defs>
    <rect x="${W / 2 - 60}" y="0" width="120" height="${H}" fill="url(#v)"/>
    <rect x="0" y="${H / 2 - 50}" width="${W}" height="100" fill="url(#h)"/>
    <g filter="url(#f)">
      <polygon points="0,0 ${W * 0.3},${H * 0.12} ${W * 0.12},${H * 0.4}" fill="#000" opacity=".08"/>
      <polygon points="${W},${H} ${W * 0.7},${H * 0.86} ${W * 0.9},${H * 0.62}" fill="#000" opacity=".09"/>
      <polygon points="${W},0 ${W * 0.78},${H * 0.2} ${W * 0.95},${H * 0.3}" fill="#fff" opacity=".2"/></g></svg>`);
}

// An old, stained page (Nexa Renew): yellowed paper, faded ink, a coffee ring and a water mark.
function stainOverlay() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <radialGradient id="ring" cx="50%" cy="50%" r="50%"><stop offset=".78" stop-color="#7a4a1a" stop-opacity="0"/>
      <stop offset=".9" stop-color="#7a4a1a" stop-opacity=".35"/><stop offset="1" stop-color="#7a4a1a" stop-opacity="0"/></radialGradient>
    <radialGradient id="blot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#a07a3c" stop-opacity=".22"/>
      <stop offset="1" stop-color="#a07a3c" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#e9d9a8" opacity=".55"/>
    <circle cx="960" cy="1420" r="170" fill="url(#ring)"/>
    <ellipse cx="300" cy="300" rx="260" ry="180" fill="url(#blot)"/>
    <ellipse cx="820" cy="980" rx="200" ry="120" fill="url(#blot)"/></svg>`);
}

// A hard shadow across half the page (No Shadow): a phone held over the page in a desk lamp's light.
function shadowOverlay() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter></defs>
    <polygon points="${W * 0.38},0 ${W},0 ${W},${H} ${W * 0.62},${H}" fill="#000" opacity=".5" filter="url(#soft)"/></svg>`);
}

// The flat page with an overlay multiplied (shading) or screened (highlights) onto it, as a PNG buffer's SVG source.
async function marked(svg, overlay, blend = 'multiply') {
  const page = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = await sharp(page).composite([{ input: overlay, blend }]).png().toBuffer();
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}"><image width="${W}" height="${H}" xlink:href="data:image/png;base64,${out.toString('base64')}"/></svg>`;
}

await photo(invoice(), 'demo-invoice.jpg', -4);
await photo(letter(), 'demo-letter.jpg', 3);
await photo(annotatedLetter(), 'demo-handwriting.jpg', -2);
await photo(await marked(invoice(), creaseOverlay(), 'over'), 'demo-creased.jpg', 2);
await photo(await marked(letter().replace(/fill="#1d1d1d"/g, 'fill="#55504a"'), stainOverlay()), 'demo-stained.jpg', -3);
await photo(await marked(invoice(), shadowOverlay()), 'demo-shadow.jpg', 1);
// Flat A4 pages for printing, so live-camera and creased-paper shots also use fictional content.
await sharp(Buffer.from(invoice())).png().toFile(path.join(out, 'print-invoice.png'));
await sharp(Buffer.from(letter())).png().toFile(path.join(out, 'print-letter.png'));
// A flat page to open in Remove Watermark (as a file, not a camera shot).
await sharp(Buffer.from(watermarkedLetter())).png().toFile(path.join(out, 'watermark-letter.png'));
console.log('demo documents written to', out);
