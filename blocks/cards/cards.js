import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import openVideoModal from '../../scripts/video-modal.js';

/**
 * Builds tab buttons from the authored tab labels of the cards.
 * Cards without a label are shown in every tab.
 * @param {Element} block The cards block
 * @param {Element[]} items The card list items
 * @returns {{tabs: Element, select: Function}|null} tabs, or null if no card has a label
 */
function buildTabs(block, items) {
  const labels = [...new Set(items.map((li) => li.dataset.tab).filter(Boolean))];
  if (!labels.length) return null;

  const tabs = document.createElement('div');
  tabs.className = 'cards-tabs';
  tabs.setAttribute('role', 'group');
  const heading = block.closest('.section')?.querySelector('h2, h3');
  tabs.setAttribute('aria-label', heading ? `Filter ${heading.textContent.trim()}` : 'Filter cards');

  const buttons = labels.map((label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cards-tab';
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

/**
 * Makes the whole card clickable when it has exactly one link.
 * @param {Element} li The card
 */
function decorateCardLink(li) {
  const links = li.querySelectorAll('.cards-card-body a[href]');
  if (links.length !== 1) return;
  const [link] = links;
  li.classList.add('cards-card-linked');
  link.classList.add('cards-card-link');
  link.closest('p')?.classList.add('cards-card-cta');
  // make generic link texts like "View product" descriptive for screen readers
  const title = li.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim();
  const text = link.textContent.trim();
  if (title && !text.includes(title)) link.setAttribute('aria-label', `${text}: ${title}`);
}

export default async function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-card';
    moveInstrumentation(row, li);
    const [, , tabCell] = [...row.children];
    if (tabCell && !tabCell.querySelector('picture')) {
      const tab = tabCell.textContent.trim();
      if (tab) li.dataset.tab = tab;
      tabCell.remove();
    }
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    li.querySelectorAll('.cards-card-body p').forEach((p) => {
      if (!p.querySelector('a') && p.textContent.trim()) p.classList.add('cards-card-meta');
    });
    // recipe cooking time such as "15 Mins": number in a badge, unit below it
    if (block.classList.contains('recipe')) {
      const meta = li.querySelector('.cards-card-meta');
      const time = meta?.textContent.trim().match(/^(\d+)\s*(.*)$/);
      if (time) {
        meta.classList.add('cards-card-time');
        meta.innerHTML = `<span class="cards-card-time-value">${time[1]}</span><span class="cards-card-time-unit">${time[2]}</span>`;
      }
    }
    decorateCardLink(li);
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // video cards play their linked video in the modal instead of leaving the page
  if (block.classList.contains('video')) {
    ul.querySelectorAll('.cards-card-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openVideoModal(link.href, link.textContent.trim() || 'Video');
      });
    });
  }

  const items = [...ul.children];
  const tabs = buildTabs(block, items);

  if (!block.classList.contains('carousel')) {
    block.replaceChildren(...(tabs ? [tabs.tabs] : []), ul);
    tabs?.buttons.forEach((button) => button.addEventListener('click', () => tabs.select(button.textContent)));
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'cards-slider';
  wrapper.append(ul);
  block.replaceChildren(...(tabs ? [tabs.tabs] : []), wrapper);

  // Universal Editor: show the tab of a card selected in the content tree
  if (tabs) {
    block.addEventListener('aue:ui-select', (e) => {
      const li = items.find((item) => item.contains(e.target));
      if (e.detail?.selected && li?.hidden) tabs.select(li.dataset.tab);
    }, { capture: true });
  }

  const slider = await createSlider(wrapper, ul, block.closest('.section')?.querySelector('h2')?.textContent.trim() || 'Cards');
  tabs?.buttons.forEach((button) => button.addEventListener('click', () => {
    tabs.select(button.textContent);
    ul.scrollTo({ left: 0 });
    slider.update();
  }));
}
