import { moveInstrumentation } from '../../scripts/scripts.js';

/** Height of the header when it stays fixed on top of the page (small screens). */
function headerOffset() {
  const nav = document.querySelector('header .nav-wrapper');
  return nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
}

/**
 * The heading a link jumps to: its #id, or else the first heading on the page
 * whose text contains the link text and isn't taken by an earlier link.
 */
function findTarget(href, text, taken) {
  const hash = href ? new URL(href, window.location.href).hash : '';
  const byId = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
  if (byId) return byId;
  const words = text.toLowerCase();
  return [...document.querySelectorAll('main h2, main h3')]
    .find((h) => !taken.includes(h) && h.textContent.toLowerCase().includes(words)) || null;
}

/**
 * Pill links that scroll to the page's sections and highlight the one in view.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'jump-links-list';
  const items = [];

  [...block.children].forEach((row) => {
    const authored = row.querySelector('a[href]');
    const text = row.textContent.trim();
    if (!text) return;
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const a = document.createElement('a');
    a.className = 'jump-links-link';
    a.textContent = text;
    // a real link from the start (keyboard and no-JS friendly); refined once headings exist
    a.href = authored?.getAttribute('href') || `#${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (authored) moveInstrumentation(authored, a);
    li.append(a);
    list.append(li);
    items.push({ a, href: authored?.getAttribute('href'), text });
  });

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Jump to');
  nav.append(list);
  block.replaceChildren(nav);

  // headings are only on the page once all sections are decorated, so resolve on first use
  let resolved = false;
  const resolve = () => {
    if (resolved) return;
    const taken = [];
    items.forEach((item) => {
      item.target = findTarget(item.href, item.text, taken);
      if (item.target) {
        taken.push(item.target);
        if (!item.target.id) item.target.id = item.text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        item.a.href = `#${item.target.id}`;
      }
    });
    resolved = items.some((item) => item.target);
  };

  const setActive = (active) => items.forEach(({ a }) => {
    if (a === active) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });

  items.forEach(({ a }) => {
    a.addEventListener('click', (e) => {
      resolve();
      const item = items.find((i) => i.a === a);
      if (!item?.target) return;
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = item.target.getBoundingClientRect().top + window.scrollY - headerOffset() - 16;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
      window.history.replaceState(null, '', a.hash);
      item.target.setAttribute('tabindex', '-1');
      item.target.focus({ preventScroll: true });
      setActive(a);
    });
  });

  // highlight the last section whose heading has scrolled past the top
  let ticking = false;
  const update = () => {
    ticking = false;
    resolve();
    const line = headerOffset() + window.innerHeight * 0.3;
    const passed = items.filter((i) => i.target && i.target.getBoundingClientRect().top <= line);
    setActive((passed.at(-1) || items[0])?.a);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  if (items.length) setActive(items[0].a);
}
