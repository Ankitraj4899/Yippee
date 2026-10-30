import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/**
 * A centred title and text (cut to two lines with Read More) above a row of images.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children];
  // the images are the items; the block's own fields (title, text) are rows of words
  const images = rows.filter(isImage);
  const words = rows.filter((row) => !images.includes(row) && row.textContent.trim());
  const textRow = words.length > 1 ? longest(words) : null;
  const titleRow = words.find((row) => row !== textRow);

  const content = [];
  if (titleRow) {
    const title = document.createElement('h2');
    title.className = 'showcase-title';
    title.textContent = titleRow.textContent.trim();
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.push(title);
  }

  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    const text = document.createElement('div');
    text.className = 'showcase-text';
    text.id = `showcase-text-${[...document.querySelectorAll('.showcase')].indexOf(block)}`;
    moveInstrumentation(textCell, text);
    text.append(...textCell.childNodes);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'showcase-more';
    more.setAttribute('aria-controls', text.id);
    more.hidden = true;
    const setOpen = (open) => {
      text.classList.toggle('collapsed', !open);
      more.textContent = open ? 'Read Less' : 'Read More';
      more.setAttribute('aria-expanded', open);
    };
    more.addEventListener('click', () => setOpen(text.classList.contains('collapsed')));
    setOpen(false);
    content.push(text, more);
    // only offer Read More when the text is longer than its two lines
    const observer = new ResizeObserver(() => {
      if (!text.classList.contains('collapsed')) return;
      more.hidden = text.scrollHeight <= text.clientHeight + 1;
    });
    observer.observe(text);
  }

  if (images.length) {
    const list = document.createElement('ul');
    list.className = 'showcase-images';
    images.forEach((row) => {
      const li = document.createElement('li');
      moveInstrumentation(row, li);
      const picture = optimizedPicture(row.firstElementChild || row, '612');
      if (picture) li.append(picture);
      list.append(li);
    });
    content.push(list);
  }

  block.replaceChildren(...content);
}
