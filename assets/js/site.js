// NexaScan site behaviour. No dependencies. Everything here is progressive: the pages read and work without it.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
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
