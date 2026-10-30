import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/**
 * Social media reels: portrait thumbnails with a play button, three across, each opening
 * its reel (e.g. on Instagram) in a new tab.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'reel-grid-list';
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const link = cells.find((c) => c !== imageCell && c.querySelector('a[href]'))?.querySelector('a[href]');
    const li = document.createElement('li');
    li.className = 'reel-grid-item';
    moveInstrumentation(row, li);
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'reel-grid-card';
    const picture = optimizedPicture(imageCell, '612');
    if (picture) card.append(picture);
    if (link) {
      card.href = link.href;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      const name = picture?.querySelector('img')?.alt || 'Reel';
      card.setAttribute('aria-label', `${name} (opens in a new tab)`);
      moveInstrumentation(link, card);
    }
    li.append(card);
    list.append(li);
  });
  block.replaceChildren(list);
}
