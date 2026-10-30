import { getMetadata } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import openShare from '../../scripts/share.js';

const ICONS = {
  time: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g></svg>',
  bowl: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a9 9 0 0 1-18 0zM8 20h8M15 4l5 5M18 3l3 3"/></g></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m-4-4 4 4 4-4M5 19h14"/></g></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l6 6-6 6M20 11h-8a7 7 0 0 0-7 7"/></g></svg>',
};

const RECIPE_INFO = ['Prep', 'Cook', 'Serves', 'Difficulty'];

/** "20 mins" → "20 Mins", like the original. */
const capitalize = (text) => text.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** An icon with a value, e.g. the cooking time. */
function stat(icon, text, className) {
  const item = document.createElement('p');
  item.className = `recipe-hero-stat ${className}`;
  item.innerHTML = ICONS[icon];
  item.append(text);
  return item;
}

/** A round icon button with its label under it (Download, Share). */
function action(icon, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `recipe-hero-${icon}`;
  button.innerHTML = `<span class="recipe-hero-icon">${ICONS[icon]}</span><span>${label}</span>`;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Top of a recipe page (built from its authored title, text, photo and Recipe Info):
 * category, title, time and ingredient count, text, Download and Share, and the photo
 * on a yellow starburst.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const cells = [...block.children].map((row) => row.firstElementChild).filter(Boolean);
  const title = cells.map((c) => c.querySelector('h1')).find(Boolean);
  const picture = cells.map((c) => c.querySelector('picture')).find(Boolean);
  const info = cells.map((c) => c.querySelector('.recipe-info')).find(Boolean);
  const texts = cells.flatMap((c) => [...c.querySelectorAll(':scope > p')])
    .filter((p) => !p.querySelector('picture, .recipe-info') && p.textContent.trim());

  const content = document.createElement('div');
  content.className = 'recipe-hero-content';
  const category = getMetadata('category');
  if (category) {
    const pill = document.createElement('p');
    pill.className = 'recipe-hero-category';
    pill.textContent = category;
    content.append(pill);
  }
  if (title) {
    title.classList.add('recipe-hero-title');
    content.append(title);
  }

  // time and ingredient count, then the rest of the recipe info
  const facts = info ? [...info.children].map((row) => row.textContent.trim()) : [];
  const stats = document.createElement('div');
  stats.className = 'recipe-hero-stats';
  const time = getMetadata('duration') || facts[1] || facts[0];
  if (time) stats.append(stat('time', capitalize(time), 'recipe-hero-time'));
  const count = document.querySelectorAll('main .recipe-ingredients li').length;
  if (count) stats.append(stat('bowl', `${count} Ingredients`, 'recipe-hero-count'));
  if (stats.children.length) content.append(stats);
  const details = facts.map((value, i) => (value ? `${RECIPE_INFO[i]} ${value}` : ''))
    .map((text) => text.replace(/^Difficulty /, ''))
    .filter(Boolean);
  if (details.length) {
    const line = document.createElement('p');
    line.className = 'recipe-hero-details';
    line.textContent = details.join(' · ');
    // the Recipe Info stays editable in the Universal Editor through this line
    moveInstrumentation(info, line);
    content.append(line);
  }

  if (texts.length) {
    const text = document.createElement('div');
    text.className = 'recipe-hero-text';
    text.append(...texts);
    content.append(text);
  }

  // Download prints the recipe (or saves it as a PDF); Share opens the Share pop-up
  const actions = document.createElement('div');
  actions.className = 'recipe-hero-actions';
  const url = window.location.href.split('#')[0];
  actions.append(
    action('download', 'Download', () => window.print()),
    action('share', 'Share', () => openShare({ url, title: title?.textContent.trim() || document.title })),
  );
  content.append(actions);

  const media = document.createElement('div');
  media.className = 'recipe-hero-media';
  if (picture) media.append(picture);

  block.replaceChildren(content, media);
}
