import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import { optimizedPicture, sectionLabel, textElement } from '../../scripts/block-helpers.js';

/**
 * Cooking time such as "15 Mins": the number goes in a badge, the unit below it.
 * @param {Element} cell The time cell
 */
function buildTime(cell) {
  const text = cell?.textContent.trim();
  if (!text) return null;
  const time = document.createElement('p');
  time.className = 'recipes-time';
  moveInstrumentation(cell, time);
  const [, value, unit] = text.match(/^(\d+)\s*(.*)$/) || [null, text, ''];
  const valueEl = document.createElement('span');
  valueEl.className = 'recipes-time-value';
  valueEl.textContent = value;
  const unitEl = document.createElement('span');
  unitEl.className = 'recipes-time-unit';
  unitEl.textContent = unit;
  time.append(valueEl, unitEl);
  return time;
}

export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'recipes-list';

  [...block.children].forEach((row) => {
    const [imageCell, titleCell, timeCell, linkCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'recipes-item';
    moveInstrumentation(row, li);

    const link = linkCell?.querySelector('a[href]');
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'recipes-card';
    if (link) {
      card.href = link.href;
      moveInstrumentation(link, card);
    }
    const picture = optimizedPicture(imageCell);
    if (picture) card.append(picture);

    const footer = document.createElement('div');
    footer.className = 'recipes-card-footer';
    const title = textElement(titleCell, 'h3', 'recipes-title');
    const time = buildTime(timeCell);
    if (title) footer.append(title);
    if (time) footer.append(time);
    card.append(footer);
    li.append(card);
    list.append(li);
  });

  const slider = document.createElement('div');
  slider.className = 'recipes-slider';
  slider.append(list);
  block.replaceChildren(slider);
  await createSlider(slider, list, sectionLabel(block, 'Recipes'));
}
