import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/**
 * A heading whose last words are highlighted in red, above an image
 * (e.g. Use the Trainers - Super Easy!).
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const imageRow = rows.find(isImage);
  // the title, then the highlighted words (AEM can leave out an empty one)
  const [titleRow, highlightRow] = rows.filter((row) => row !== imageRow && row.textContent.trim());

  const content = [];
  if (titleRow) {
    const title = document.createElement('h2');
    title.className = 'titled-image-title';
    title.textContent = titleRow.textContent.trim();
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    if (highlightRow) {
      const highlight = document.createElement('span');
      highlight.className = 'titled-image-highlight';
      highlight.textContent = highlightRow.textContent.trim();
      title.append(' ', highlight);
    }
    content.push(title);
  }
  const picture = optimizedPicture(imageRow?.firstElementChild || imageRow, '2000');
  if (picture) content.push(picture);
  block.replaceChildren(...content);
}
