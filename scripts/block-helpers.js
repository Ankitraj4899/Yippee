import { createOptimizedPicture } from './aem.js';
import { moveInstrumentation } from './scripts.js';

// links AEM renders for image fields holding an outside image address
// (e.g. https://s7ap1.scene7.com/is/image/…?fmt=png-alpha, which has no file extension)
const IMAGE_LINK = /(\.(png|jpe?g|gif|webp|avif|svg)([?#]|$))|\/is\/image\//i;

/**
 * Picture for an image field AEM rendered as a link to the image, its alt text as
 * the link text.
 * @param {Element} cell The block cell
 * @returns {HTMLPictureElement|null}
 */
function linkedPicture(cell) {
  const link = cell?.querySelector('a[href]');
  // only a cell holding just the image link, not text with a link in it
  const onlyLink = cell?.textContent.trim() === link?.textContent.trim();
  if (!link || !onlyLink || !IMAGE_LINK.test(link.href)) return null;
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = link.href;
  img.alt = link.textContent.trim() === link.href ? '' : link.textContent.trim();
  img.loading = 'lazy';
  moveInstrumentation(link, img);
  picture.append(img);
  return picture;
}

/**
 * Returns an optimized copy of the picture in a block cell, keeping the
 * Universal Editor instrumentation of the image.
 * @param {Element} cell The block cell holding the authored picture (or a link to an image)
 * @param {string} [width] The image width to request
 * @returns {HTMLPictureElement|null} the optimized picture, or null if the cell has none
 */
export function optimizedPicture(cell, width = '750') {
  const img = cell?.querySelector('picture img');
  if (!img) return linkedPicture(cell);
  // images from another host (e.g. an image server link in local test content)
  // can't take Edge Delivery's resize parameters, so they are used as they are
  if (new URL(img.src, window.location.href).origin !== window.location.origin) {
    const picture = img.closest('picture').cloneNode(true);
    moveInstrumentation(img, picture.querySelector('img'));
    return picture;
  }
  const picture = createOptimizedPicture(img.src, img.alt, false, [{ width }]);
  moveInstrumentation(img, picture.querySelector('img'));
  return picture;
}

/**
 * Creates an element holding the text of a block cell, keeping the cell's
 * Universal Editor instrumentation so the field stays editable in place.
 * @param {Element} cell The block cell
 * @param {string} tag The tag of the element to create
 * @param {string} className The class of the element
 * @returns {HTMLElement|null} the element, or null if the cell is empty
 */
export function textElement(cell, tag, className) {
  const text = cell?.textContent.trim();
  if (!text) return null;
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  moveInstrumentation(cell, el);
  return el;
}

/**
 * Accessible label for a block, taken from its section's heading.
 * @param {Element} block The block
 * @param {string} fallback Label to use when the section has no heading
 */
export function sectionLabel(block, fallback) {
  return block.closest('.section')?.querySelector('h2, h3')?.textContent.trim() || fallback;
}
