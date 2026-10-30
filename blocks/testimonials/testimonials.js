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
 * Review cards (photo, name, star rating, review) in a slider.
 * @param {Element} block The block
 */
export default async function decorate(block) {
  const label = sectionLabel(block, 'Testimonials');
  const list = document.createElement('ul');
  list.className = 'testimonials-list';

  [...block.children].forEach((row) => {
    // AEM can leave out empty fields, so cells are told apart by what they hold
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const ratingCell = cells.find((c) => /^\s*[1-5]\s*$/.test(c.textContent));
    const words = cells.filter((c) => c !== imageCell && c !== ratingCell && c.textContent.trim());
    const textCell = words.length > 1 ? longest(words) : null;
    const nameCell = words.find((c) => c !== textCell);
    const li = document.createElement('li');
    li.className = 'testimonials-item';
    moveInstrumentation(row, li);
    const card = document.createElement('figure');
    card.className = 'testimonials-card';

    const head = document.createElement('figcaption');
    head.className = 'testimonials-head';
    const picture = optimizedPicture(imageCell, '128');
    const avatar = document.createElement('span');
    avatar.className = 'testimonials-avatar';
    if (picture) {
      picture.querySelector('img').alt = '';
      avatar.append(picture);
    }
    const who = document.createElement('span');
    who.className = 'testimonials-who';
    const name = document.createElement('span');
    name.className = 'testimonials-name';
    name.textContent = nameCell?.textContent.trim() || '';
    if (nameCell) moveInstrumentation(nameCell, name);
    who.append(name);
    const stars = Math.min(5, Math.max(0, parseInt(ratingCell?.textContent, 10) || 0));
    if (stars) {
      const rating = document.createElement('span');
      rating.className = 'testimonials-stars';
      rating.setAttribute('role', 'img');
      rating.setAttribute('aria-label', `${stars} out of 5 stars`);
      rating.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
      who.append(rating);
    }
    head.append(avatar, who);

    const quote = document.createElement('blockquote');
    quote.className = 'testimonials-text';
    if (textCell) {
      moveInstrumentation(textCell, quote);
      quote.append(...textCell.childNodes);
    }
    card.append(head, quote);
    li.append(card);
    list.append(li);
  });

  const slider = document.createElement('div');
  slider.className = 'testimonials-slider';
  slider.append(list);
  block.replaceChildren(slider);
  await createSlider(slider, list, label);
}
