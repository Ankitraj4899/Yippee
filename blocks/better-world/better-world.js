import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture, textElement } from '../../scripts/block-helpers.js';

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'better-world-list';

  [...block.children].forEach((row) => {
    const [imageCell, titleCell, descriptionCell, linkCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'better-world-item';
    moveInstrumentation(row, li);

    const link = linkCell?.querySelector('a[href]');
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'better-world-card';
    if (link) {
      card.href = link.href;
      moveInstrumentation(link, card);
    }
    const picture = optimizedPicture(imageCell, '400');
    if (picture) card.append(picture);
    const title = textElement(titleCell, 'h3', 'better-world-title');
    const description = textElement(descriptionCell, 'p', 'better-world-description');
    if (title) card.append(title);
    if (description) card.append(description);
    li.append(card);
    list.append(li);
  });

  block.replaceChildren(list);
}
