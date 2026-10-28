import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import { optimizedPicture, sectionLabel, textElement } from '../../scripts/block-helpers.js';

const indexes = new Map();

/**
 * Loads a query index once per page.
 * @param {string} url The index URL
 * @returns {Promise<Object[]>} the index rows
 */
function loadIndex(url) {
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
function buildTime(text, cell) {
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
function buildCard({
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

/** Card for an authored recipe row: image, title, cooking time, link. */
function authoredCard(row) {
  const [imageCell, titleCell, timeCell, linkCell] = [...row.children];
  const link = linkCell?.querySelector('a[href]');
  const li = buildCard({
    href: link?.href,
    picture: optimizedPicture(imageCell),
    title: textElement(titleCell, 'h3', 'recipes-title'),
    time: buildTime(timeCell?.textContent.trim(), timeCell),
  });
  moveInstrumentation(row, li);
  if (link) moveInstrumentation(link, li.querySelector('.recipes-card'));
  return li;
}

/** Card for a recipe page listed in the query index. */
function indexedCard(recipe) {
  const title = document.createElement('h3');
  title.className = 'recipes-title';
  title.textContent = recipe.title;
  const picture = recipe.image
    ? createOptimizedPicture(recipe.image, recipe.title, false, [{ width: '750' }])
    : null;
  return buildCard({
    href: recipe.path, picture, title, time: buildTime(recipe.duration),
  });
}

function emptyState() {
  const li = document.createElement('li');
  li.className = 'recipes-empty';
  li.textContent = 'New recipes are coming soon.';
  return li;
}

export default async function decorate(block) {
  const rows = [...block.children];
  // block properties come first as one-cell rows; recipes are four-cell rows
  const source = rows.find((row) => row.children.length === 1)?.textContent.trim();
  const recipeRows = rows.filter((row) => row.children.length > 1);

  const list = document.createElement('ul');
  list.className = 'recipes-list';
  const slider = document.createElement('div');
  slider.className = 'recipes-slider';
  slider.append(list);

  if (!source) {
    recipeRows.forEach((row) => list.append(authoredCard(row)));
    block.replaceChildren(slider);
    await createSlider(slider, list, sectionLabel(block, 'Recipes'));
    return;
  }

  // dynamic listing: recipe pages from the query index, filtered by category
  const recipes = (await loadIndex(source))
    .filter((row) => row.path?.startsWith('/recipes/') && row.title);
  const section = block.closest('.section');
  const render = () => {
    const category = section?.dataset.recipeCategory?.toLowerCase();
    const matches = recipes.filter((r) => !category || r.category?.toLowerCase() === category);
    list.replaceChildren(...(matches.length ? matches.map(indexedCard) : [emptyState()]));
    list.scrollTo({ left: 0 });
  };
  render();
  block.replaceChildren(slider);
  const api = await createSlider(slider, list, sectionLabel(block, 'Recipes'));
  section?.addEventListener('recipes:filter', () => {
    render();
    api.update();
  });
}
