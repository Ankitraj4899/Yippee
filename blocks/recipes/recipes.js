import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import { optimizedPicture, sectionLabel, textElement } from '../../scripts/block-helpers.js';
import {
  loadIndex, buildTime, buildCard, indexedCard, emptyState,
} from './recipes-cards.js';

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

export default async function decorate(block) {
  const rows = [...block.children];
  // read the label before the cards add their own headings to the section
  const label = sectionLabel(block, 'Recipes');
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
    await createSlider(slider, list, label);
    return;
  }

  // dynamic listing: recipe pages from the query index, filtered by category
  block.dataset.source = source;
  const recipes = (await loadIndex(source))
    .filter((row) => row.path?.startsWith('/recipes/') && row.title);

  // grid variant: every recipe in a grid with Filters and Load More, no slider
  if (block.classList.contains('grid')) {
    const { default: decorateGrid } = await import('./recipes-grid.js');
    decorateGrid(block, recipes, label);
    return;
  }

  const section = block.closest('.section');
  const render = () => {
    const category = section?.dataset.recipeCategory?.toLowerCase();
    const matches = recipes.filter((r) => !category || r.category?.toLowerCase() === category);
    list.replaceChildren(...(matches.length ? matches.map(indexedCard) : [emptyState()]));
    list.scrollTo({ left: 0 });
  };
  render();
  block.replaceChildren(slider);
  const api = await createSlider(slider, list, label);
  section?.addEventListener('recipes:filter', () => {
    render();
    api.update();
  });
}
