import { moveInstrumentation } from '../../scripts/scripts.js';

// one row per field, in the order of the block model
const LABELS = ['Prep Time', 'Cook Time', 'Serves', 'Difficulty'];

export default function decorate(block) {
  const list = document.createElement('dl');
  list.className = 'recipe-info-list';

  [...block.children].forEach((row, i) => {
    const cell = row.firstElementChild;
    const value = cell?.textContent.trim();
    if (!value || !LABELS[i]) return;
    const item = document.createElement('div');
    item.className = 'recipe-info-item';
    const dt = document.createElement('dt');
    dt.textContent = LABELS[i];
    const dd = document.createElement('dd');
    dd.textContent = value;
    moveInstrumentation(cell, dd);
    item.append(dt, dd);
    list.append(item);
  });

  block.replaceChildren(list);
}
