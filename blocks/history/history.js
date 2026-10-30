import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import { optimizedPicture, sectionLabel } from '../../scripts/block-helpers.js';

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/**
 * Timeline of years beside a slider of milestone cards. Picking a year shows its
 * first card; the arrows step through every card and move the timeline along.
 * @param {Element} block The block
 */
export default async function decorate(block) {
  const label = sectionLabel(block, 'History');
  const timeline = document.createElement('ol');
  timeline.className = 'history-timeline';
  const cards = document.createElement('ul');
  cards.className = 'history-cards';
  const years = [];

  [...block.children].forEach((row) => {
    // AEM can leave out empty fields, so cells are told apart by what they hold:
    // the year, one or two images (timeline logo, card image), the text
    const cells = [...row.children];
    const yearCell = cells.find((c) => /^\s*\d{4}\s*$/.test(c.textContent) && !c.querySelector('picture, img'));
    const images = cells.filter((c) => c !== yearCell && isImage(c));
    const textCell = longest(cells.filter((c) => c !== yearCell && !images.includes(c)
      && c.textContent.trim()));
    const imageCell = images.at(-1);
    const logoCell = images.length > 1 ? images[0] : null;
    const year = yearCell?.textContent.trim() || '';

    const card = document.createElement('li');
    card.className = 'history-card';
    card.dataset.year = year;
    moveInstrumentation(row, card);
    const picture = optimizedPicture(imageCell, '568');
    if (picture) card.append(picture);
    if (year) {
      const yearEl = document.createElement('p');
      yearEl.className = 'history-card-year';
      yearEl.textContent = year;
      card.append(yearEl);
    }
    if (textCell?.textContent.trim()) {
      const text = document.createElement('div');
      text.className = 'history-card-text';
      moveInstrumentation(textCell, text);
      text.append(...textCell.childNodes);
      card.append(text);
    }
    cards.append(card);

    // one timeline entry per year, pointing at the year's first card
    if (year && !years.some((y) => y.year === year)) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-year';
      const text = document.createElement('span');
      text.className = 'history-year-text';
      text.textContent = year;
      button.append(text);
      const logo = optimizedPicture(logoCell, '168');
      if (logo) {
        logo.querySelector('img').alt = '';
        button.append(logo);
      }
      button.setAttribute('aria-label', `Show ${year}`);
      li.append(button);
      timeline.append(li);
      years.push({ year, button, card });
    }
  });

  const stage = document.createElement('div');
  stage.className = 'history-stage';
  stage.append(cards);
  block.replaceChildren(timeline, stage);
  const slider = await createSlider(stage, cards, label);

  const allCards = [...cards.children];
  const setActive = (year) => years.forEach((entry) => {
    const active = entry.year === year;
    entry.button.setAttribute('aria-pressed', active);
    if (active) {
      // keep the active year visible inside the timeline (not the page)
      const list = timeline.getBoundingClientRect();
      const item = entry.button.getBoundingClientRect();
      const top = timeline.scrollTop + item.top - list.top - (list.height - item.height) / 2;
      const left = timeline.scrollLeft + item.left - list.left - (list.width - item.width) / 2;
      timeline.scrollTo({ top, left, behavior: 'smooth' });
    }
  });

  years.forEach(({ year, button, card }) => {
    button.addEventListener('click', () => {
      slider.goTo(allCards.indexOf(card));
      setActive(year);
    });
  });

  let ticking = false;
  cards.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      const step = allCards[0]?.offsetWidth || 1;
      const card = allCards[Math.round(cards.scrollLeft / step)];
      if (card) setActive(card.dataset.year);
    });
  }, { passive: true });

  if (years.length) setActive(years[0].year);
}
