import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'category-links-list';

  [...block.children].forEach((row) => {
    const [imageCell, linkCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'category-links-item';
    moveInstrumentation(row, li);

    const link = linkCell?.querySelector('a[href]');
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'category-links-card';
    if (link) {
      card.href = link.href;
      moveInstrumentation(link, card);
    }
    const picture = optimizedPicture(imageCell, '200');
    if (picture) card.append(picture);
    const name = document.createElement('span');
    name.className = 'category-links-name';
    name.textContent = (link || linkCell)?.textContent.trim() || '';
    card.append(name);
    li.append(card);
    list.append(li);
  });

  block.replaceChildren(list);
}
