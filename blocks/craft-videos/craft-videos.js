import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';
import openVideoModal from '../../scripts/video-modal.js';

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/**
 * Craft videos filtered by category: a bar per category (in the order they first appear),
 * then the cards of the chosen one, each opening its video in the pop-up.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const items = [...block.children].map((row) => {
    // AEM can leave out empty fields, so cells are told apart by what they hold
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const videoCell = cells.find((c) => c !== imageCell && c.querySelector('a[href]'));
    const words = cells.filter((c) => c !== imageCell && c !== videoCell);
    const categoryCell = words.find((c) => c.textContent.trim());
    return {
      row,
      imageCell,
      video: videoCell?.querySelector('a[href]'),
      category: categoryCell?.textContent.trim() || 'Other',
    };
  });
  const categories = [...new Set(items.map((item) => item.category))];

  const tablist = document.createElement('div');
  tablist.className = 'craft-videos-categories';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Categories');
  const tabs = categories.map((category) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'craft-videos-category';
    tab.setAttribute('role', 'tab');
    tab.innerHTML = '<span class="craft-videos-bar" aria-hidden="true"></span><span class="craft-videos-name"></span>';
    tab.querySelector('.craft-videos-name').textContent = category;
    tablist.append(tab);
    return tab;
  });

  const list = document.createElement('ul');
  list.className = 'craft-videos-list';
  list.id = `craft-videos-${[...document.querySelectorAll('.craft-videos')].indexOf(block)}`;
  list.setAttribute('role', 'tabpanel');
  const cards = items.map(({
    row, imageCell, video, category,
  }) => {
    const li = document.createElement('li');
    li.className = 'craft-videos-item';
    li.dataset.category = category;
    moveInstrumentation(row, li);
    const card = document.createElement(video ? 'a' : 'div');
    card.className = 'craft-videos-card';
    const picture = optimizedPicture(imageCell, '612');
    if (picture) card.append(picture);
    if (video) {
      const name = picture?.querySelector('img')?.alt || 'DIY craft';
      card.href = video.href;
      card.setAttribute('aria-label', `Play video: ${name}`);
      moveInstrumentation(video, card);
      card.addEventListener('click', (e) => {
        e.preventDefault();
        openVideoModal(video.href, name);
      });
    }
    li.append(card);
    list.append(li);
    return li;
  });

  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      if (selected) list.setAttribute('aria-labelledby', tab.id);
    });
    cards.forEach((li) => { li.hidden = li.dataset.category !== categories[index]; });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.id = `${list.id}-tab-${i}`;
    tab.setAttribute('aria-controls', list.id);
    tab.addEventListener('click', () => select(i));
  });
  tablist.addEventListener('keydown', (e) => {
    const current = tabs.indexOf(document.activeElement);
    const moves = {
      ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1,
    };
    if (current < 0 || !(e.key in moves)) return;
    e.preventDefault();
    select((moves[e.key] + tabs.length) % tabs.length, true);
  });

  block.replaceChildren(tablist, list);
  if (tabs.length) select(0);
}
