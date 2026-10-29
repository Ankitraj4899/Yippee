import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// recipe cards shared by the slider (recipes.js) and the grid (recipes-grid.js)

const indexes = new Map();

/**
 * Loads a query index once per page.
 * @param {string} url The index URL
 * @returns {Promise<Object[]>} the index rows
 */
export function loadIndex(url) {
  if (!indexes.has(url)) {
    indexes.set(url, fetch(url)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => json.data || [])
      .catch(() => []));
  }
  return indexes.get(url);
}

/**
 * Cooking time such as "15 Mins": the number goes in a badge, the unit below it.
 * @param {string} text The cooking time
 * @param {Element} [cell] The authored cell, to keep its editor instrumentation
 */
export function buildTime(text, cell) {
  if (!text) return null;
  const time = document.createElement('p');
  time.className = 'recipes-time';
  if (cell) moveInstrumentation(cell, time);
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

/**
 * Builds one recipe card.
 * @param {{href: string, picture: Element, title: Element, time: Element}} parts card parts
 */
export function buildCard({
  href, picture, title, time,
}) {
  const li = document.createElement('li');
  li.className = 'recipes-item';
  const card = document.createElement(href ? 'a' : 'div');
  card.className = 'recipes-card';
  if (href) card.href = href;
  if (picture) card.append(picture);
  const footer = document.createElement('div');
  footer.className = 'recipes-card-footer';
  if (title) footer.append(title);
  if (time) footer.append(time);
  card.append(footer);
  li.append(card);
  return li;
}

/** Card for a recipe page listed in the query index. */
export function indexedCard(recipe) {
  const title = document.createElement('h3');
  title.className = 'recipes-title';
  title.textContent = recipe.title;
  // pages without a photo get the site's default share image, which the card skips
  const hasPhoto = recipe.image && !recipe.image.startsWith('/default-meta-image');
  const picture = hasPhoto
    ? createOptimizedPicture(recipe.image, recipe.title, false, [{ width: '750' }])
    : null;
  return buildCard({
    href: recipe.path, picture, title, time: buildTime(recipe.duration),
  });
}

export function emptyState(text = 'New recipes are coming soon.') {
  const li = document.createElement('li');
  li.className = 'recipes-empty';
  li.textContent = text;
  return li;
}
