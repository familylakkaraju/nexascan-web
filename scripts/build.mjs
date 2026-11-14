// Builds the static site into dist/.
//
// Every page in src/pages is an HTML fragment whose first line is a JSON comment:
//   <!--{"title":"…","description":"…","nav":"features"}-->       add "index": false to keep a page out of search
// The build wraps it in src/layout.html, replacing:
//   {{root}}         a relative prefix to the site root ("./", "../"), so the site works at
//                    https://<user>.github.io/nexascan-web/ and at a custom domain alike
//   {{seo_head}}     canonical + og:url (indexable pages) or robots noindex; JSON-LD and the Search Console
//                    verification tag on the home page
//   {{title}} {{description}} {{og_image}} {{year}}
//   {{nav:<key>}}    aria-current="page" on the active nav link
//   {{include:name}} a partial from src/partials
//   {{config:key}}   a value from site.config.json (store URL, developer name …)
//   {{email:key}}    a contact address from site.config.json as a mailto link (or its "[… REQUIRED]" marker)
//   {{gen:name}}     HTML generated from src/data/plans.json (Free/Pro facts), so no page repeats that list by hand
// Pages at src/pages/<name>/index.html become dist/<name>/index.html, so /privacy/ works directly.
import { readFile, writeFile, mkdir, readdir, cp, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
const plans = JSON.parse(await readFile(path.join(src, 'data', 'plans.json'), 'utf8'));
const siteBase = config.siteUrl.replace(/\/$/, '');
const pages = [];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const proTag = '<span class="tag tag-pro">Pro</span>';
// "ai": true in plans.json marks a tool that runs one of the app's on-device models (the Nexa Page Model, the Nexa
// Watermark Model or ML Kit text recognition), checked against the app's code like every other claim.
const aiTag = '<span class="tag tag-ai" title="Uses NexaScan\'s on-device AI">AI</span>';

// One line icon per tool and tool family (24 × 24, drawn with the current colour). Keys are the "icon" values in
// plans.json; an unknown key is a build error, so a new tool can't ship without one.
const iconPaths = {
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  sign: '<path d="M3 17c3-1 4-6 6-6s0 5 2 5 2-3 4-3 2 2 3 2"/><path d="M3 21h18"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14 8l3 3"/>',
  numbers: '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  stamp: '<path d="M9 13V9.5a3 3 0 1 1 6 0V13"/><path d="M5 13h14v4H5zM6 21h12"/>',
  eraser: '<path d="M8 20h12"/><path d="M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H7z"/><path d="M9 11l5 5"/>',
  pen: '<path d="M12 19l7-7 3 3-7 7z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
  merge: '<path d="M8 6h5a4 4 0 0 1 4 4v10"/><path d="M14 17l3 3 3-3"/><rect x="3" y="3" width="5" height="6" rx="1"/>',
  split: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/>',
  pages: '<rect x="7" y="3" width="13" height="15" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h10"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  select: '<path d="M4 7V5h2M10 5h4M18 5h2v2M20 11v2M20 17v2h-2M14 19h-4M6 19H4v-2M4 13v-2"/><path d="M8 10h8M8 14h5"/>',
  text: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  search: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M14 3v5h5v2"/><circle cx="16.5" cy="16.5" r="3"/><path d="M21 21l-2.2-2.2"/>',
  images: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><path d="M17 16l-4-4-7 7"/>',
  word: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12l1.5 5 2-4 2 4 1.5-5"/>',
  sheet: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M3.5 15h17M9.5 4v16"/>',
  compress: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.2"/>',
  sparkle: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
};
const icon = (key, size = 22) => {
  if (!(key in iconPaths)) throw new Error(`unknown icon ${key}`);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[key]}</svg>`;
};
const allTools = () => plans.groups.flatMap((g) => g.tools);
const heightAt900 = (ratio) => { const [w, h] = ratio.split('/').map(Number); return Math.round(900 * h / w); };
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The two looks that open an editor are shown on the letter they were captured on.
const lookAlt = {
  'No Watermark': 'A sample letter after its DRAFT watermark was found and removed',
  'No Handwriting': 'A sample letter with the pen marks NexaScan found highlighted for removal',
};

// The Features page's screen gallery: [file in assets/screenshots, caption, alt text].
const screens = [
  ['tools', 'All Tools', 'The All Tools screen, with every tool grouped as Create, Edit & Sign, Organise Pages, View & OCR and Convert & Export'],
  ['looks', 'Clean-up looks', 'A scanned invoice with the strip of clean-up looks below it, Nexa Magic and Nexa Renew among them'],
  ['remove-watermark', 'Remove Watermark', 'Remove Watermark with a DRAFT watermark brushed over on a sample letter'],
  ['edit-pdf', 'Edit PDF', 'Edit PDF with a signature placed on the invoice and the Sign, Add Text, Brush and Watermark tools'],
  ['ocr-select', 'OCR Document Viewer', 'Rows of a scanned invoice selected in the OCR Document Viewer, with Copy and Share'],
  ['extract-text', 'Extract Text', 'Extract Text showing the recognised words of a scanned invoice'],
  ['convert', 'PDF to Word', 'A Word document created from the invoice, ready to open or share'],
  ['merge', 'Merge PDF', 'Merge PDF with three sample PDFs in order, ready to merge'],
  ['split', 'Split & Extract', 'Split & Extract with the pages of a sample PDF to pick from'],
  ['page-numbers', 'Add Page Numbers', 'Add Page Numbers with its format, position, style and page options'],
  ['watermark-pdf', 'Watermark PDF', 'Watermark PDF adding a CONFIDENTIAL text watermark, with colour choices'],
  ['multi-page', 'Multi-Page Sheet', 'Multi-Page Sheet fitting a three-page PDF onto one sheet, 4 per sheet'],
  ['compress', 'Compress PDF', 'Compress PDF with High quality, Balanced and Maximum compression levels'],
  ['save-as', 'Save a scan', 'Saving a scan as a PDF with Make PDF searchable and Extract text switched on'],
];

// The home page's Nexa AI studio: one before/after pair per clean-up, real app output on the fictional demo pages.
const studio = [
  { id: 'magic', before: 'magic-before', after: 'magic-after', label: 'Nexa Magic', ratio: '815 / 1156',
    alt: ['The fictional letter photographed on yellowed paper with a coffee ring and a water mark', 'The same letter after Nexa Magic: white paper, crisp text, the stains gone'],
    caption: 'Nexa Magic on a stained sample letter, captured in the app. Drag to compare.' },
  { id: 'renew', before: 'renew-before', after: 'renew-after', label: 'Nexa Renew', ratio: '815 / 1156',
    alt: ['The fictional letter on yellowed, stained paper', 'The same letter after Nexa Renew: rebuilt on fresh paper, keeping its green heading'],
    caption: 'Nexa Renew on the same letter: rebuilt on fresh paper, colours kept. Drag to compare.' },
  { id: 'shadow', before: 'shadow-before', after: 'shadow-after', label: 'No Shadow', ratio: '815 / 1156',
    alt: ['The fictional invoice with a dark shadow across half of it', 'The same invoice after No Shadow, evenly lit'],
    caption: 'No Shadow on a sample invoice, captured in the app. Drag to compare.' },
  { id: 'watermark', before: 'watermark-before', after: 'watermark-after', label: 'Remove Watermark', ratio: '991 / 1298',
    alt: ['The fictional letter with a large DRAFT watermark across it', 'The same letter after Remove Watermark: the watermark is gone and the text is intact'],
    caption: 'Remove Watermark found and removed the DRAFT mark by itself. Drag to compare.' },
];
const cell = (v) => (v === true ? '<span class="yes" aria-label="Included">✓</span>'
  : v === false ? '<span class="no" aria-label="Not included">–</span>' : esc(v));

// Generated sections. Each returns HTML built only from plans.json.
const generators = {
  'tool-groups': () => plans.groups.map((g) => `
        <article class="group reveal">
          <h2 class="h3">${esc(g.name)}</h2>
          <p>${esc(g.summary)}</p>
          <ul class="tool-list">
${g.tools.map((t) => `            <li><strong>${esc(t.name)}${t.tier === 'pro' ? ` ${proTag}` : ''}</strong><span>${esc(t.benefit)}${t.limit ? ` <em>Free: ${esc(t.limit)}.</em>` : ''}</span></li>`).join('\n')}
          </ul>
        </article>`).join('\n'),
  'compare-table': () => `<div class="table-wrap compare-table"><table>
          <caption class="visually-hidden">What NexaScan Free and NexaScan Pro include</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Pro</th></tr></thead>
          <tbody>
${plans.compare.map((r) => `            <tr><th scope="row">${esc(r.feature)}</th><td>${cell(r.free)}</td><td>${cell(r.pro)}</td></tr>`).join('\n')}
          </tbody>
        </table></div>`,
  'pro-highlights': () => plans.proHighlights.map((h) => `<li>${esc(h)}</li>`).join('\n          '),
  'free-looks': () => esc(plans.looks.free.join(', ').replace(/, ([^,]+)$/, ' and $1')),
  'pro-looks': () => esc(plans.looks.proNamed.join(', ').replace(/, ([^,]+)$/, ' and $1')),
  'tool-count': () => String(allTools().length),
  'looks-count': () => String(plans.looks.free.length + plans.looks.proNamed.length),
  'pro-looks-count': () => String(plans.looks.proNamed.length),
  // Home: one card per tool family, linking to that family on the Features page.
  'tool-families': () => plans.groups.map((g) => `
        <a class="family reveal" href="{{root}}features/#${esc(g.id)}">
          <span class="family-icon">${icon(g.icon, 24)}</span>
          <span class="family-count">${g.tools.length} ${g.tools.length === 1 ? 'tool' : 'tools'}</span>
          <h3>${esc(g.name)}</h3>
          <p>${esc(g.summary)}</p>
          <span class="family-tools">${g.tools.map((t) => esc(t.name.replace(/^PDF \/ Image to /, 'To '))).join(' · ')}</span>
        </a>`).join(''),
  // Features: every family as a section of tool cards, each with its icon, Pro tag and Free limit.
  'tool-sections': () => plans.groups.map((g) => `
      <section class="tool-section" id="${esc(g.id)}" aria-labelledby="${esc(g.id)}-title">
        <div class="tool-section-head reveal">
          <span class="family-icon">${icon(g.icon, 24)}</span>
          <div><h2 id="${esc(g.id)}-title">${esc(g.name)}</h2><p>${esc(g.summary)}</p></div>
        </div>
        <ul class="tool-cards">
${g.tools.map((t) => `          <li class="tool-card reveal">
            <span class="tool-icon">${icon(t.icon)}</span>
            <h3>${esc(t.name)}${t.ai ? ` ${aiTag}` : ''}${t.tier === 'pro' ? ` ${proTag}` : ''}</h3>
            <p>${esc(t.benefit)}</p>${t.limit ? `\n            <p class="tool-limit">Free: ${esc(t.limit)}</p>` : ''}
          </li>`).join('\n')}
        </ul>
      </section>`).join('\n'),
  // Home: the studio's before/after panels (the tabs are in the page; panel ids match their aria-controls).
  'studio-panels': () => studio.map((s) => `
      <figure class="studio-panel" id="panel-${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}">
        <div class="compare" data-compare style="aspect-ratio:${s.ratio}">
          <img src="{{root}}assets/screenshots/${s.before}.webp" alt="${esc(s.alt[0])}" width="900" height="${heightAt900(s.ratio)}" loading="lazy">
          <img class="compare-after" src="{{root}}assets/screenshots/${s.after}.webp" alt="${esc(s.alt[1])}" width="900" height="${heightAt900(s.ratio)}" loading="lazy">
          <span class="compare-line" aria-hidden="true"></span>
          <span class="compare-label before" aria-hidden="true">Photo</span>
          <span class="compare-label after" aria-hidden="true">${esc(s.label)}</span>
          <input type="range" min="0" max="100" value="50" aria-label="Compare the photographed page with the ${esc(s.label)} result">
          <span class="compare-knob" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></span>
        </div>
        <figcaption>${esc(s.caption)}</figcaption>
      </figure>`).join(''),
  // The twelve looks, the same page in each, Pro ones tagged.
  'looks-grid': () => `<ul class="looks">
${[...plans.looks.free.map((n) => [n, false]), ...plans.looks.proNamed.map((n) => [n, true])].map(([n, pro]) => `      <li class="look reveal"><img src="{{root}}assets/screenshots/look-${slug(n.replace(/&/g, ''))}.webp" alt="${esc(lookAlt[n] ?? `The sample invoice in the ${n} look`)}" width="400" height="567" loading="lazy">${esc(n)}${pro ? ` ${proTag}` : ''}</li>`).join('\n')}
    </ul>`,
  // Features: a strip of real screens, each a capture from the app on the fictional demo documents.
  'screen-gallery': () => `<div class="gallery reveal">
${screens.map(([file, caption, alt]) => `      <figure><div class="phone phone-sm"><img src="{{root}}assets/screenshots/${file}.webp" alt="${esc(alt)}" width="540" height="1094" loading="lazy"></div><figcaption>${esc(caption)}</figcaption></figure>`).join('\n')}
    </div>`,
  // Features: in-page navigation to each family.
  'family-nav': () => plans.groups.map((g) => `<li><a href="#${esc(g.id)}">${icon(g.icon, 18)}${esc(g.name)}</a></li>`).join(''),
  'price-line': () => (plans.pricing.confirmed
    ? `${esc(plans.pricing.monthly)} a month or ${esc(plans.pricing.annual)} a year in the ${esc(plans.pricing.region)}. Google Play shows the price for your country before you pay.`
    : 'Monthly or yearly subscription. Google Play shows the price for your country before you pay.'),
};

// Site identity for Google (home page only): the site name and who publishes it. Only facts that are visible on the
// site; no ratings, no logo claim for the organisation (the NexaScan logo is the product's, not the company's).
function jsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${siteBase}/#website`, name: config.appName, url: config.siteUrl, inLanguage: 'en-GB',
        publisher: { '@id': `${siteBase}/#organization` } },
      { '@type': 'Organization', '@id': `${siteBase}/#organization`, name: config.developer, url: config.siteUrl },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

// Download buttons, from site.config.json. Three states:
//   storeUrl (the public listing)  the official Google Play badge everywhere (Google's badge guidelines need a real
//                                  public listing to link to)
//   testUrl (a testing opt-in)     "Install the test version", with a note that it is for invited testers: a test
//                                  link works only for Google accounts on the test's tester list. testUrl is Play
//                                  Console's "Join on the web" link; with testAndroidUrl ("Join on Android") also
//                                  set, the note and the download section offer both
//   neither                        "Coming to Google Play", linking to the download section
// download_cta is the download section's buttons: store_cta, except for a test with both join links.
function downloadVars(rootPrefix) {
  if (config.storeUrl) {
    const href = esc(config.storeUrl);
    const cta = `<a class="store-badge" href="${href}" rel="noopener"><img src="${rootPrefix}assets/brand/google-play-badge.png" alt="Get it on Google Play" width="646" height="250"></a>`;
    return {
      store_href: href, store_label: 'Get it on Google Play', store_rel: 'rel="noopener"', store_note: '',
      store_cta: cta, download_cta: cta,
      download_heading: 'Get NexaScan on Google Play',
      download_text: 'Free to download for Android phones. Scan your first document in seconds.',
    };
  }
  if (config.testUrl) {
    const web = esc(config.testUrl);
    const android = config.testAndroidUrl ? esc(config.testAndroidUrl) : '';
    const cta = `<a class="button" href="${web}" rel="noopener">Install the test version</a>`;
    return {
      store_href: web, store_label: 'Install the test version', store_rel: 'rel="noopener"', store_cta: cta,
      store_note: android
        ? `<p class="store-note">Test version on Google Play, for invited testers. Join <a href="${android}" rel="noopener">on Android</a> or <a href="${web}" rel="noopener">on the web</a>.</p>`
        : '<p class="store-note">Test version on Google Play, for invited testers.</p>',
      download_cta: android
        ? `<a class="button" href="${android}" rel="noopener">Join on Android</a><a class="button button-outline" href="${web}" rel="noopener">Join on the web</a>`
        : cta,
      download_heading: 'Try NexaScan now',
      download_text: android
        ? 'NexaScan is being tested on Google Play. Invited testers can join on an Android phone or on the web, then install the test version.'
        : 'NexaScan is being tested on Google Play. Invited testers can install the test version with this link.',
    };
  }
  const cta = `<a class="button" href="${rootPrefix}#download">Coming to Google Play</a>`;
  return {
    store_href: `${rootPrefix}#download`, store_label: 'Coming to Google Play', store_rel: '', store_note: '',
    store_cta: cta, download_cta: cta,
    download_heading: 'NexaScan is coming to Google Play',
    download_text: 'For Android phones. When the Google Play listing opens, this button will take you straight to it.',
  };
}

// The sitemap's lastmod is the date of the last commit that touched a page's own content. Without full git history
// (no git, or a shallow CI clone) it is left out rather than guessed: Google ignores lastmod it can't trust.
const git = process.env.GIT || 'git';
const gitHistory = (() => {
  try { return execFileSync(git, ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'false'; }
  catch { return false; }
})();
function lastModified(files) {
  if (!gitHistory) return '';
  try {
    return execFileSync(git, ['log', '-1', '--format=%cs', '--', ...files.map((f) => path.relative(root, f))],
      { cwd: root, encoding: 'utf8' }).trim();
  } catch { return ''; }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const partials = {};
for (const file of await readdir(path.join(src, 'partials'))) {
  partials[path.basename(file, '.html')] = await readFile(path.join(src, 'partials', file), 'utf8');
}
const layout = await readFile(path.join(src, 'layout.html'), 'utf8');

function render(template, vars, depth = 0) {
  if (depth > 5) throw new Error('include nesting too deep');
  return template
    .replace(/\{\{include:([\w-]+)\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`unknown partial ${name}`);
      return render(partials[name], vars, depth + 1);
    })
    .replace(/\{\{gen:([\w-]+)\}\}/g, (_, name) => {
      if (!(name in generators)) throw new Error(`unknown generator ${name}`);
      return generators[name]();
    })
    .replace(/\{\{icon:([\w-]+)\}\}/g, (_, name) => icon(name, 20))
    .replace(/\{\{email:(\w+)\}\}/g, (_, key) => {
      // A contact address from site.config.json: a mailto link once it is filled in, the highlighted owner-input
      // marker while it still reads "[… REQUIRED]".
      const value = config[key];
      if (value === undefined) throw new Error(`unknown config key ${key}`);
      return /REQUIRED\]$/.test(value) ? `<span class="placeholder">${esc(value)}</span>` : `<a href="mailto:${esc(value)}">${esc(value)}</a>`;
    })
    .replace(/\{\{config:([\w.]+)\}\}/g, (_, key) => {
      const value = key.split('.').reduce((o, k) => o?.[k], config);
      if (value === undefined) throw new Error(`unknown config key ${key}`);
      return String(value);
    })
    .replace(/\{\{nav:([\w-]+)\}\}/g, (_, key) => (key === vars.nav ? 'aria-current="page"' : ''))
    .replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const pageFiles = (await walk(path.join(src, 'pages'))).filter((f) => f.endsWith('.html'));
for (const file of pageFiles) {
  const rel = path.relative(path.join(src, 'pages'), file).replaceAll('\\', '/');
  const raw = await readFile(file, 'utf8');
  const meta = raw.match(/^<!--(\{.*?\})-->/s);
  if (!meta) throw new Error(`${rel}: missing front-matter comment`);
  const front = JSON.parse(meta[1]);
  const body = raw.slice(meta[0].length);
  const depth = rel.split('/').length - 1;
  // 404.html is served by GitHub Pages at whatever path was missed, so relative links would break; it uses the
  // site's absolute base path instead.
  const rootPrefix = rel === '404.html' ? new URL(config.siteUrl).pathname : depth === 0 ? './' : '../'.repeat(depth);
  const pagePath = rel === 'index.html' ? '' : rel.replace(/index\.html$/, '').replace(/\.html$/, '.html');
  const canonical = siteBase + '/' + pagePath;
  // Index control lives in the front matter: "index": false gives the page a robots noindex and keeps it out of the
  // sitemap. The 404 page is never indexable. A noindexed page gets no canonical (it has no URL of its own to claim).
  const indexable = rel !== '404.html' && front.index !== false;
  pages.push({ rel, file, canonical, indexable, body });
  const head = [
    indexable ? `<link rel="canonical" href="${canonical}">` : '<meta name="robots" content="noindex">',
    indexable ? `<meta property="og:url" content="${canonical}">` : '',
    rel === 'index.html' && config.seo?.googleSiteVerification
      ? `<meta name="google-site-verification" content="${esc(config.seo.googleSiteVerification)}">` : '',
    rel === 'index.html' ? jsonLd() : '',
  ].filter(Boolean).join('\n  ');
  const vars = {
    root: rootPrefix,
    title: esc(front.title),
    description: esc(front.description),
    nav: front.nav ?? '',
    bodyClass: front.bodyClass ?? '',
    seo_head: head,
    og_image: siteBase + '/assets/brand/og-image.png',
    year: String(new Date().getFullYear()),
    ...downloadVars(rootPrefix),
  };
  const html = render(layout.replace('{{content}}', body), vars);
  if (/\{\{[\w:.-]+\}\}/.test(html)) throw new Error(`${rel}: unresolved placeholder ${html.match(/\{\{[\w:.-]+\}\}/)[0]}`);
  const out = path.join(dist, rel);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
}

// Static assets, copied as they are.
await cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
try { await stat(path.join(root, 'public', '.nojekyll')); await cp(path.join(root, 'public', '.nojekyll'), path.join(dist, '.nojekyll')); } catch { /* optional */ }

// sitemap.xml: the canonical URL of every indexable page, nothing else.
const entries = pages.filter((p) => p.indexable).sort((a, b) => a.canonical.length - b.canonical.length || a.canonical.localeCompare(b.canonical)).map((p) => {
  const lastmod = lastModified(p.body.includes('{{gen:') ? [p.file, path.join(src, 'data', 'plans.json')] : [p.file]);
  return `  <url><loc>${p.canonical}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
});
await writeFile(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);

// robots.txt only counts at the root of a host. On a project site (https://<owner>.github.io/<repo>/) a file here
// would be ignored, so none is written; the sitemap is submitted in Search Console instead. With a custom domain
// (siteUrl at a host root) the build writes one that allows everything and names the sitemap.
if (new URL(config.siteUrl).pathname === '/') {
  await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteBase}/sitemap.xml\n`);
}

console.log(`Built ${pageFiles.length} pages into dist/ (${entries.length} in sitemap${gitHistory ? '' : ', no lastmod: full git history unavailable'})`);
