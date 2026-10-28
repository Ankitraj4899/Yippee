import { decorateIcons, getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// social networks recognized by link host, mapped to the icon in /icons
const SOCIAL_ICONS = {
  'instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'youtube.com': 'youtube',
  'x.com': 'x',
  'twitter.com': 'x',
};

/**
 * Turns links to known social networks into icon links.
 * @param {Element} footer The footer element
 */
function decorateSocialLinks(footer) {
  footer.querySelectorAll('.footer-bottom a[href]').forEach((link) => {
    let host;
    try {
      host = new URL(link.href).hostname.replace(/^www\./, '');
    } catch (e) {
      return;
    }
    const icon = SOCIAL_ICONS[host];
    if (!icon) return;
    const label = link.textContent.trim() || icon;
    link.setAttribute('aria-label', label);
    link.classList.add('footer-social');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `<span class="icon icon-${icon}"></span>`;
    link.closest('ul')?.classList.add('footer-social-links');
  });
  decorateIcons(footer);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  const sections = [...footer.children];
  // with a single section (e.g. only a copyright line), treat it as the bottom bar
  const classes = sections.length === 1 ? ['bottom'] : ['brand', 'links', 'bottom'];
  classes.forEach((c, i) => sections[i]?.classList.add(`footer-${c}`));
  decorateSocialLinks(footer);

  block.append(footer);
}
