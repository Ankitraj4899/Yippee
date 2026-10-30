import { loadCSS } from './aem.js';

// line icons drawn in the yellow circles
const ICONS = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M13.6 21v-7.4h2.6l.5-3.1h-3.1V8.6c0-.9.4-1.6 1.7-1.6h1.5V4.2a18 18 0 0 0-2.3-.2c-2.4 0-4 1.5-4 4.1v2.4H7.8v3.1h2.7V21z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M3.5 3.5h5l12 17h-5zM20 3.5l-6.9 7.8M4 20.5l6.9-7.8"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="3.5" y="9" width="4" height="11.5" rx=".6"/><circle cx="5.5" cy="5.2" r="2"/><path d="M10.2 9h3.7v1.6c.7-1.1 2-1.9 3.6-1.9 2.6 0 3.9 1.6 3.9 4.6v7.2h-4v-6.4c0-1.3-.5-2-1.6-2s-1.7.8-1.7 2v6.4h-3.9z"/></g></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="M2.5 5.5l9.5 8 9.5-8"/></g></svg>',
};

const NETWORKS = [
  { name: 'facebook', label: 'Facebook', href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  {
    name: 'twitter',
    label: 'Twitter',
    href: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  { name: 'linkedin', label: 'LinkedIn', href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  {
    name: 'mail',
    label: 'Mail',
    href: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

let dialog;

function buildDialog() {
  const el = document.createElement('dialog');
  el.className = 'share-dialog';
  el.setAttribute('aria-labelledby', 'share-dialog-title');
  el.innerHTML = `
    <div class="share-dialog-head">
      <h2 class="share-dialog-title" id="share-dialog-title">Share</h2>
      <button type="button" class="share-dialog-close" aria-label="Close"></button>
    </div>
    <ul class="share-dialog-links">
      ${NETWORKS.map(({ name, label }) => `<li><a class="share-dialog-link" data-network="${name}" target="_blank" rel="noopener noreferrer">
        <span class="share-dialog-icon">${ICONS[name]}</span>${label}</a></li>`).join('')}
    </ul>
    <div class="share-dialog-copy">
      <input class="share-dialog-url" type="text" readonly aria-label="Link to share">
      <button type="button" class="share-dialog-copy-button">Copy</button>
    </div>
    <p class="share-dialog-status" role="status"></p>`;

  const close = () => el.close();
  el.querySelector('.share-dialog-close').addEventListener('click', close);
  // a click on the dark backdrop (outside the box) closes the dialog
  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });

  const input = el.querySelector('.share-dialog-url');
  const copy = el.querySelector('.share-dialog-copy-button');
  const status = el.querySelector('.share-dialog-status');
  input.addEventListener('focus', () => input.select());
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      copy.textContent = 'Copied';
      status.textContent = 'Link copied';
    } catch {
      input.select();
      status.textContent = 'Press Ctrl+C to copy the link';
    }
  });
  el.addEventListener('close', () => {
    copy.textContent = 'Copy';
    status.textContent = '';
  });

  document.body.append(el);
  return el;
}

/**
 * Opens the Share pop-up (Facebook, Twitter, LinkedIn, Mail and a link to copy),
 * one dialog shared by every Share button on the page.
 * @param {{url: string, title?: string}} page The page to share
 */
export default async function openShare({ url, title = document.title }) {
  await loadCSS(`${window.hlx.codeBasePath}/styles/share.css`);
  if (!dialog) dialog = buildDialog();
  const { href } = new URL(url, window.location.href);
  dialog.querySelectorAll('.share-dialog-link').forEach((link) => {
    const { network } = link.dataset;
    link.href = NETWORKS.find((n) => n.name === network).href(href, title);
  });
  dialog.querySelector('.share-dialog-url').value = href;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.share-dialog-close').focus();
}
