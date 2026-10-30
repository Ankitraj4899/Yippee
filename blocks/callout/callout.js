import { moveInstrumentation } from '../../scripts/scripts.js';

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/**
 * A boxed note in an article (Tip, Did You Know?…); the Summary option makes it the
 * article's summary box.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.textContent.trim());
  // AEM can leave out the empty title: the text is the longest field, the title the other
  const textRow = rows.length > 1 ? longest(rows) : rows[0];
  const titleRow = rows.find((row) => row !== textRow);

  const content = [];
  if (titleRow) {
    const title = document.createElement('p');
    title.className = 'callout-title';
    title.textContent = titleRow.textContent.trim();
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.push(title);
  }
  const cell = textRow?.firstElementChild;
  if (cell) {
    const text = document.createElement('div');
    text.className = 'callout-text';
    moveInstrumentation(cell, text);
    text.append(...cell.childNodes);
    content.push(text);
  }
  block.replaceChildren(...content);
}
