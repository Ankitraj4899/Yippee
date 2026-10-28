import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'social-wall-list';

  [...block.children].forEach((row) => {
    const [imageCell, linkCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'social-wall-item';
    moveInstrumentation(row, li);

    const link = linkCell?.querySelector('a[href]');
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'social-wall-card';
    const picture = optimizedPicture(imageCell, '600');
    if (picture) card.append(picture);
    if (link) {
      card.href = link.href;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      const alt = picture?.querySelector('img')?.alt;
      card.setAttribute('aria-label', alt ? `${alt} (opens in a new tab)` : 'View post (opens in a new tab)');
      moveInstrumentation(link, card);
    }
    li.append(card);
    list.append(li);
  });

  block.replaceChildren(list);
}
