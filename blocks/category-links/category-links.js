import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

/**
 * Filter mode: the categories act as tabs for the Recipes block in the same
 * section. The selected category is kept on the section and announced with a
 * "recipes:filter" event. With the "all" option nothing is picked at first
 * (every recipe shows) and picking the selected category again clears it.
 * @param {Element} block The block
 * @param {HTMLButtonElement[]} buttons The category buttons
 */
function setUpFilter(block, buttons) {
  const section = block.closest('.section');
  const showAll = block.classList.contains('all');
  const select = (button) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', b === button));
    const category = button?.dataset.category || '';
    if (section) {
      section.dataset.recipeCategory = category;
      section.dispatchEvent(new CustomEvent('recipes:filter', { detail: { category } }));
    }
  };
  buttons.forEach((button) => button.addEventListener('click', () => {
    const isSelected = button.getAttribute('aria-pressed') === 'true';
    select(showAll && isSelected ? null : button);
  }));
  if (showAll) select(null);
  else if (buttons.length) select(buttons[0]);
}

export default function decorate(block) {
  const isFilter = block.classList.contains('filter');
  const list = document.createElement('ul');
  list.className = 'category-links-list';
  if (isFilter) list.setAttribute('aria-label', 'Recipe categories');
  const buttons = [];

  [...block.children].filter((row) => row.children.length > 1).forEach((row) => {
    const [imageCell, linkCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'category-links-item';
    moveInstrumentation(row, li);

    const link = linkCell?.querySelector('a[href]');
    const name = (link || linkCell)?.textContent.trim() || '';
    let card;
    if (isFilter) {
      card = document.createElement('button');
      card.type = 'button';
      card.dataset.category = name;
      buttons.push(card);
    } else {
      card = document.createElement(link ? 'a' : 'div');
      if (link) card.href = link.href;
    }
    card.className = 'category-links-card';
    if (link) moveInstrumentation(link, card);
    const picture = optimizedPicture(imageCell, '200');
    if (picture) card.append(picture);
    const label = document.createElement('span');
    label.className = 'category-links-name';
    label.textContent = name;
    card.append(label);
    li.append(card);
    list.append(li);
  });

  block.replaceChildren(list);
  if (isFilter) setUpFilter(block, buttons);
}
