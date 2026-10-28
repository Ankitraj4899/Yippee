import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import { optimizedPicture, sectionLabel } from '../../scripts/block-helpers.js';

/**
 * Builds tab buttons from the products' tab labels.
 * Products without a label are shown in every tab.
 * @param {Element} block The block
 * @param {Element[]} items The product list items
 * @returns {{tabs: Element, buttons: Element[], select: Function}|null} null without tab labels
 */
function buildTabs(block, items) {
  const labels = [...new Set(items.map((li) => li.dataset.tab).filter(Boolean))];
  if (!labels.length) return null;

  const tabs = document.createElement('div');
  tabs.className = 'product-range-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', `Filter ${sectionLabel(block, 'products')}`);

  const buttons = labels.map((label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-range-tab';
    button.textContent = label;
    tabs.append(button);
    return button;
  });

  const select = (label) => {
    buttons.forEach((button) => button.setAttribute('aria-pressed', button.textContent === label));
    items.forEach((li) => {
      li.hidden = !!li.dataset.tab && li.dataset.tab !== label;
    });
  };
  select(labels[0]);
  return { tabs, buttons, select };
}

export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'product-range-list';

  [...block.children].forEach((row) => {
    const [imageCell, linkCell, tabCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'product-range-item';
    moveInstrumentation(row, li);

    const link = linkCell?.querySelector('a[href]');
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'product-range-card';
    if (link) {
      card.href = link.href;
      const name = link.textContent.trim();
      // the product name is printed on the pack; screen readers get it from the label
      if (name && name !== link.href) card.setAttribute('aria-label', name);
      moveInstrumentation(link, card);
    }
    const picture = optimizedPicture(imageCell);
    if (picture) card.append(picture);
    li.append(card);

    const tab = tabCell?.textContent.trim();
    if (tab) li.dataset.tab = tab;
    list.append(li);
  });

  const items = [...list.children];
  const tabs = buildTabs(block, items);
  const slider = document.createElement('div');
  slider.className = 'product-range-slider';
  slider.append(list);
  block.replaceChildren(...(tabs ? [tabs.tabs] : []), slider);

  // Universal Editor: show the tab of a product selected in the content tree
  if (tabs) {
    block.addEventListener('aue:ui-select', (e) => {
      const li = items.find((item) => item.contains(e.target));
      if (e.detail?.selected && li?.hidden) tabs.select(li.dataset.tab);
    }, { capture: true });
  }

  const api = await createSlider(slider, list, sectionLabel(block, 'Products'));
  tabs?.buttons.forEach((button) => button.addEventListener('click', () => {
    tabs.select(button.textContent);
    list.scrollTo({ left: 0 });
    api.update();
  }));
}
