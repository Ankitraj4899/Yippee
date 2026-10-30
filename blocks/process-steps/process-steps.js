import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/**
 * Numbered steps of a process under a sparkle heading, the image and text swapping sides
 * from one step to the next, with a star and a curly line beside each.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children];
  // the steps are the items (an image and words); the block's own field, the heading,
  // is a one-cell row of words
  const steps = rows.filter((row) => row.children.length > 1 || isImage(row));
  const titleRow = rows.find((row) => !steps.includes(row) && row.textContent.trim());

  const content = [];
  if (titleRow) {
    const title = document.createElement('h2');
    title.className = 'process-steps-title';
    title.textContent = titleRow.textContent.trim();
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.push(title);
  }

  const list = document.createElement('ol');
  list.className = 'process-steps-list';
  steps.forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const words = cells.filter((c) => c !== imageCell && c.textContent.trim());
    const textCell = words.length > 1 ? longest(words) : null;
    const nameCell = words.find((c) => c !== textCell);

    const li = document.createElement('li');
    li.className = 'process-steps-item';
    moveInstrumentation(row, li);
    const picture = optimizedPicture(imageCell, '480');
    if (picture) {
      const media = document.createElement('div');
      media.className = 'process-steps-image';
      media.append(picture);
      li.append(media);
    }
    const body = document.createElement('div');
    body.className = 'process-steps-body';
    if (nameCell) {
      const name = document.createElement('h3');
      name.className = 'process-steps-name';
      name.textContent = nameCell.textContent.trim();
      moveInstrumentation(nameCell, name);
      body.append(name);
    }
    if (textCell) {
      const text = document.createElement('div');
      text.className = 'process-steps-text';
      moveInstrumentation(textCell, text);
      text.append(...textCell.childNodes);
      body.append(text);
    }
    li.append(body);
    list.append(li);
  });
  content.push(list);

  block.replaceChildren(...content);
}
