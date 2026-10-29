import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Orange call-to-action banner: title, text and a button.
 * Placed in a section with a Recipes grid, it shows between the recipe rows.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const [titleRow, textRow, linkRow] = [...block.children];
  const content = document.createElement('div');
  content.className = 'promo-banner-content';

  const titleText = titleRow?.textContent.trim();
  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'promo-banner-title';
    title.textContent = titleText;
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.append(title);
  }

  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    const text = document.createElement('div');
    text.className = 'promo-banner-text';
    moveInstrumentation(textCell, text);
    text.append(...textCell.childNodes);
    content.append(text);
  }

  const link = linkRow?.querySelector('a[href]');
  if (link) {
    link.className = 'button primary';
    link.closest('p')?.classList.remove('button-wrapper');
    const actions = document.createElement('p');
    actions.className = 'promo-banner-action';
    actions.append(link);
    content.append(actions);
  }

  block.replaceChildren(content);
}
