// NexaScan site behaviour. No dependencies. Everything here is progressive: the pages read and work without it.
document.documentElement.classList.add('js');

// Which store suits this visitor: Apple (iPhone, iPad, Mac) or Google Play (Android). iPadOS reports itself as a Mac,
// and a Mac can install the iPad app, so both count as Apple. Anything else (Windows, Linux) sees both stores.
const platform = (() => {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod|macintosh|mac os x/i.test(ua)) return 'apple';
  return 'other';
})();
document.documentElement.classList.add(`on-${platform}`);

// Ad campaign tags. A landing URL such as /smart-redact/?utm_source=google&utm_campaign=redact-uk keeps its tags for
// this visit (sessionStorage, never a cookie) and passes them to the stores' own install reports:
//   Google Play: the referrer parameter (Play Console › Statistics › Acquisition by campaign);
//   App Store:   ct (the campaign) and pt (the provider token in site.config.json), for App Analytics › Campaigns.
// Nothing is sent to us or to anyone else.
const campaign = (() => {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const q = new URLSearchParams(location.search);
  let tags = {};
  keys.forEach((k) => { if (q.get(k)) tags[k] = q.get(k).slice(0, 100); });
  try {
    if (Object.keys(tags).length) sessionStorage.setItem('nexascan-campaign', JSON.stringify(tags));
    else tags = JSON.parse(sessionStorage.getItem('nexascan-campaign') || '{}');
  } catch { /* storage blocked: tags apply to this page only */ }
  return tags;
})();

function storeLink(href) {
  if (!Object.keys(campaign).length || !href) return href;
  let url;
  try { url = new URL(href, location.href); } catch { return href; }
  if (url.hostname === 'play.google.com' && url.pathname.startsWith('/store/apps/details')) {
    url.searchParams.set('referrer', new URLSearchParams(campaign).toString());
  } else if (url.hostname === 'apps.apple.com') {
    const pt = document.querySelector('meta[name="nexascan:app-store-pt"]')?.content;
    if (pt) {
      url.searchParams.set('pt', pt);
      url.searchParams.set('ct', (campaign.utm_campaign || campaign.utm_source || 'web').slice(0, 40));
      url.searchParams.set('mt', '8');
    }
  }
  return url.toString();
}


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[data-store]').forEach((a) => { a.href = storeLink(a.getAttribute('href')); });

  // On a phone or Apple computer only its own store shows; a small link reveals the other one.
  if (platform !== 'other') {
    document.querySelectorAll('[data-store-other]').forEach((p) => { p.hidden = false; });
    document.querySelectorAll('[data-show-stores]').forEach((b) => b.addEventListener('click', () => {
      document.documentElement.classList.add('show-all-stores');
      document.querySelectorAll('[data-store-other]').forEach((p) => { p.hidden = true; });
    }));
  }

  // The /get/ smart link (for ads and QR codes): straight to this device's store; other devices see both buttons.
  const smart = document.querySelector('[data-smart-link]');
  if (smart) {
    const target = document.querySelector(`[data-smart-link] a[data-store="${platform === 'android' ? 'google' : 'apple'}"]`);
    if (platform !== 'other' && target && target.href) location.replace(target.href);
  }

  // Phones: a slim "Get the app" bar once the visitor has scrolled past the first screen, hidden again over the
  // download section so the bar never covers the buttons it repeats.
  const bar = document.querySelector('[data-getbar]');
  const band = document.getElementById('download');
  if (bar && !smart) {
    bar.hidden = false;
    const update = () => {
      const past = window.scrollY > window.innerHeight * 0.9;
      const r = band?.getBoundingClientRect();
      const overBand = r && r.top < window.innerHeight && r.bottom > 0;
      bar.classList.toggle('is-shown', past && !overBand);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  // Header shadow once the page scrolls.
  const header = document.querySelector('[data-header]');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile navigation.
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); } });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  }

  // Scroll reveal. With reduced motion the CSS shows everything at once; the observer is skipped too.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }

  // Before/after comparison: a native range input drives the split, so it works with keyboard and screen readers.
  document.querySelectorAll('[data-compare]').forEach((box) => {
    const range = box.querySelector('input[type="range"]');
    const apply = () => box.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', apply);
    apply();
  });

  // Tabs (the Nexa AI studio): ARIA tabs with arrow-key movement. Without JS every panel shows, one under another.
  document.querySelectorAll('[data-tabs]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (step) { e.preventDefault(); select((i + step + tabs.length) % tabs.length, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
    select(Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')), false);
  });
});
