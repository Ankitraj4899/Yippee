import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/**
 * Centred tiles of an icon, a title and optional text (values, certifications).
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'value-tiles-list';
  [...block.children].forEach((row) => {
    // AEM can leave out empty fields, so cells are told apart by what they hold
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const words = cells.filter((c) => c !== imageCell && c.textContent.trim());
    const textCell = words.length > 1 ? longest(words) : null;
    const titleCell = words.find((c) => c !== textCell);
    const li = document.createElement('li');
    li.className = 'value-tiles-item';
    moveInstrumentation(row, li);

    const picture = optimizedPicture(imageCell, '552');
    if (picture) {
      picture.classList.add('value-tiles-icon');
      li.append(picture);
    }
    const titleText = titleCell?.textContent.trim();
    if (titleText) {
      const title = document.createElement('h3');
      title.className = 'value-tiles-title';
      title.textContent = titleText;
      moveInstrumentation(titleCell, title);
      li.append(title);
    }
    if (textCell?.textContent.trim()) {
      const text = document.createElement('div');
      text.className = 'value-tiles-text';
      moveInstrumentation(textCell, text);
      text.append(...textCell.childNodes);
      li.append(text);
    }
    list.append(li);
  });
  block.replaceChildren(list);
}
