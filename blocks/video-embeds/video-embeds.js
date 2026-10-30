import { moveInstrumentation } from '../../scripts/scripts.js';

const PAGE_SIZE = 4;

/** The YouTube video id of a link (youtu.be, watch?v=, embed/ or shorts/), or ''. */
function youtubeId(href) {
  try {
    const url = new URL(href);
    if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1).split('/')[0];
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    return url.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/)?.[1] || '';
  } catch {
    return '';
  }
}

/** A video's still with a play button; the player loads only when it is chosen. */
function video(link, name) {
  const id = youtubeId(link.href);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video-embeds-play';
  button.setAttribute('aria-label', `Play video: ${name}`);
  moveInstrumentation(link, button);
  const img = document.createElement('img');
  img.src = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  img.alt = '';
  img.loading = 'lazy';
  button.append(img);
  button.addEventListener('click', () => {
    if (!id) {
      window.open(link.href, '_blank', 'noopener');
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    frame.title = name;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    button.replaceWith(frame);
    frame.focus();
  });
  return button;
}

/**
 * Videos (e.g. TV ads) two across, each playing in place, four at a time with Load More.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'video-embeds-list';
  const items = [...block.children].map((row, i) => {
    const link = row.querySelector('a[href]');
    if (!link) return null;
    const titleCell = [...row.children].find((c) => !c.querySelector('a[href]') && c.textContent.trim());
    const name = titleCell?.textContent.trim() || `Video ${i + 1}`;
    const li = document.createElement('li');
    li.className = 'video-embeds-item';
    moveInstrumentation(row, li);
    li.append(video(link, name));
    list.append(li);
    return li;
  }).filter(Boolean);

  const more = document.createElement('p');
  more.className = 'button-wrapper video-embeds-more';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button primary';
  button.textContent = 'Load More';
  more.append(button);
  let shown = PAGE_SIZE;
  const show = () => {
    items.forEach((li, i) => { li.hidden = i >= shown; });
    more.hidden = items.length <= shown;
  };
  button.addEventListener('click', () => {
    const next = items[shown];
    shown += PAGE_SIZE;
    show();
    next?.querySelector('button')?.focus();
  });
  show();
  block.replaceChildren(list, more);
}
