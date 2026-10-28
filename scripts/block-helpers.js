import { createOptimizedPicture } from './aem.js';
import { moveInstrumentation } from './scripts.js';

/**
 * Returns an optimized copy of the picture in a block cell, keeping the
 * Universal Editor instrumentation of the image.
 * @param {Element} cell The block cell holding the authored picture
 * @param {string} [width] The image width to request
 * @returns {HTMLPictureElement|null} the optimized picture, or null if the cell has none
 */
export function optimizedPicture(cell, width = '750') {
  const img = cell?.querySelector('picture img');
  if (!img) return null;
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
