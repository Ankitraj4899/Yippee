import { getMetadata } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { formatDate } from '../../scripts/blog-helpers.js';

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.4V21z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2.2 3h6.2l4.4 5.8zm-1 16.2h1.7L7.3 4.7H5.5z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4m-7.6 6.8 7.6 4.4"/></g></svg>',
};

/** A round share button. */
function shareButton(name, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `article-header-share-${name}`;
  button.setAttribute('aria-label', label);
  button.innerHTML = ICONS[name];
  button.addEventListener('click', onClick);
  return button;
}

/** Opens a share page in a small pop-up window (a new tab where pop-ups are blocked). */
const openShare = (url) => window.open(url, '_blank', 'noopener,noreferrer,width=600,height=520');

/**
 * Top of a blog article: its topic, title, reviewer, date and reading time (from the
 * page's Blog properties), and share buttons.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.textContent.trim());
  // the title is authored as a heading (h1); the reviewer is plain text
  const titleRow = rows.find((row) => row.querySelector('h1, h2')) || rows[0];
  const authorRow = rows.find((row) => row !== titleRow);

  const topic = getMetadata('topic');
  const published = getMetadata('published');
  const readTime = getMetadata('readtime');

  const content = [];
  if (topic) {
    const tag = document.createElement('p');
    tag.className = 'article-header-topic';
    tag.textContent = topic;
    content.push(tag);
  }
  if (titleRow) {
    const title = document.createElement('h1');
    title.className = 'article-header-title';
    title.textContent = titleRow.textContent.trim();
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.push(title);
  }

  const bar = document.createElement('div');
  bar.className = 'article-header-bar';
  const byline = document.createElement('div');
  byline.className = 'article-header-byline';
  byline.innerHTML = '<span class="article-header-avatar" aria-hidden="true"></span><div><p class="article-header-author"></p><p class="article-header-meta"></p></div>';
  const author = byline.querySelector('.article-header-author');
  author.textContent = authorRow?.textContent.trim() || '';
  if (authorRow) moveInstrumentation(authorRow.firstElementChild || authorRow, author);
  const metaLine = [published && formatDate(published, true), readTime].filter(Boolean).join(' · ');
  const metaEl = byline.querySelector('.article-header-meta');
  if (metaLine) metaEl.textContent = metaLine;
  else metaEl.remove();
  if (published) {
    const time = document.createElement('time');
    time.dateTime = published.slice(0, 10);
    time.textContent = metaEl.textContent;
    metaEl.replaceChildren(time);
  }

  const share = document.createElement('div');
  share.className = 'article-header-share';
  share.innerHTML = '<span class="article-header-share-label">Share</span>';
  const url = window.location.href.split('#')[0];
  const name = document.title;
  const status = document.createElement('span');
  status.className = 'article-header-share-status';
  status.setAttribute('role', 'status');
  share.append(
    shareButton('whatsapp', 'Share on WhatsApp', () => openShare(`https://wa.me/?text=${encodeURIComponent(`${name} ${url}`)}`)),
    shareButton('facebook', 'Share on Facebook', () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)),
    shareButton('x', 'Share on X', () => openShare(`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(name)}`)),
    shareButton('copy', 'Copy link', async () => {
      try {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Link copied';
      } catch {
        status.textContent = 'Could not copy the link';
      }
      setTimeout(() => { status.textContent = ''; }, 2500);
    }),
  );
  // the device's own share sheet, where there is one
  if (navigator.share) {
    share.append(shareButton('more', 'More ways to share', () => navigator.share({ title: name, url }).catch(() => {})));
  }
  share.append(status);
  bar.append(byline, share);
  content.push(bar);

  block.replaceChildren(...content);
}
