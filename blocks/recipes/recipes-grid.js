import { indexedCard, emptyState } from './recipes-cards.js';
import { popupController, addCardMenu } from './recipes-menu.js';

// recipes shown at first and added by each "Load More"
const PAGE_SIZE = 12;
// a Promo Banner block in the same section is shown after this many recipes
const PROMO_AFTER = 6;
// filter groups, read from the recipe index columns of the same name
const FILTER_GROUPS = [
  { key: 'products', label: 'Products' },
  { key: 'diet', label: 'Diet', order: ['Veg', 'Non Veg'] },
];

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

/** Index values such as "Magic Masala Noodles, Pasta Treat Masala" as a list. */
const valuesOf = (value) => (value || '').split(',').map((v) => v.trim()).filter(Boolean);

function sortOptions(values, order = []) {
  const rank = (v) => (order.includes(v) ? order.indexOf(v) : order.length);
  return [...values].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * Filters button and panel: one tab per group, a checkbox per value.
 * @returns {{element: Element, selected: Object<string, Set<string>>}|null}
 */
function buildFilters(recipes, popups, onChange) {
  const groups = FILTER_GROUPS
    .map((group) => ({
      ...group,
      options: sortOptions(new Set(recipes.flatMap((r) => valuesOf(r[group.key]))), group.order),
    }))
    .filter((group) => group.options.length);
  if (!groups.length) return null;

  const selected = Object.fromEntries(groups.map((g) => [g.key, new Set()]));
  const wrapper = document.createElement('div');
  wrapper.className = 'recipes-filters';
  const panelId = nextId('recipes-filters');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'recipes-filters-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panelId);
  const count = document.createElement('span');
  count.className = 'recipes-filters-count';
  toggle.append(count, 'Filters');

  const panel = document.createElement('div');
  panel.className = 'recipes-filters-panel';
  panel.id = panelId;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Filters');
  panel.hidden = true;

  const head = document.createElement('div');
  head.className = 'recipes-filters-head';
  const title = document.createElement('p');
  title.className = 'recipes-filters-title';
  title.textContent = 'Filters';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'recipes-filters-close';
  close.setAttribute('aria-label', 'Close filters');
  head.append(title, close);

  const body = document.createElement('div');
  body.className = 'recipes-filters-body';
  const tabs = document.createElement('div');
  tabs.className = 'recipes-filters-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-orientation', 'vertical');
  body.append(tabs);

  const checkboxes = [];
  const tabButtons = groups.map((group, i) => {
    const tabId = nextId('recipes-filters-tab');
    const listId = nextId('recipes-filters-list');
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = tabId;
    tab.className = 'recipes-filters-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', listId);
    tab.textContent = group.label;

    const fieldset = document.createElement('fieldset');
    fieldset.id = listId;
    fieldset.className = 'recipes-filters-options';
    fieldset.setAttribute('role', 'tabpanel');
    fieldset.setAttribute('aria-labelledby', tabId);
    const legend = document.createElement('legend');
    legend.textContent = group.label;
    fieldset.append(legend);
    group.options.forEach((value) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = value;
      input.addEventListener('change', () => {
        if (input.checked) selected[group.key].add(value);
        else selected[group.key].delete(value);
        onChange();
      });
      checkboxes.push(input);
      label.append(input, value);
      fieldset.append(label);
    });
    body.append(fieldset);

    const select = () => tabButtons.forEach(({ button, panel: p }) => {
      const active = button === tab;
      button.setAttribute('aria-selected', active);
      button.tabIndex = active ? 0 : -1;
      p.hidden = !active;
    });
    tab.addEventListener('click', select);
    tab.addEventListener('keydown', (e) => {
      const step = {
        ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1,
      }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = tabButtons[(i + step + tabButtons.length) % tabButtons.length].button;
      next.click();
      next.focus();
    });
    tabs.append(tab);
    return { button: tab, panel: fieldset };
  });
  tabButtons[0].button.click();

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'button secondary recipes-filters-clear';
  clear.textContent = 'Clear All';
  clear.addEventListener('click', () => {
    checkboxes.forEach((input) => { input.checked = false; });
    Object.values(selected).forEach((set) => set.clear());
    onChange();
  });

  panel.append(head, body, clear);
  wrapper.append(toggle, panel);

  const setOpen = (open, refocus = false) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open);
    if (open) panel.querySelector('[role="tab"][aria-selected="true"]')?.focus();
    if (!open && refocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    if (popups.isOpen(setOpen)) popups.close();
    else popups.open(setOpen, wrapper);
  });
  close.addEventListener('click', () => popups.close(true));

  const updateCount = () => {
    const n = Object.values(selected).reduce((sum, set) => sum + set.size, 0);
    count.textContent = n ? `(${n})` : '';
    toggle.setAttribute('aria-label', n ? `Filters, ${n} selected` : 'Filters');
    clear.disabled = !n;
  };
  updateCount();
  return { element: wrapper, selected, updateCount };
}

/**
 * Recipe listing: every recipe from the index in a grid, filtered by the
 * section's category tabs and the Filters panel, with "Load More".
 * @param {Element} block The recipes block
 * @param {object[]} recipes Recipe index rows
 * @param {string} label Accessible name of the list
 */
export default function decorateGrid(block, recipes, label) {
  const section = block.closest('.section');
  const popups = popupController();
  let shown = PAGE_SIZE;

  const list = document.createElement('ul');
  list.className = 'recipes-list';
  list.setAttribute('aria-label', label);

  // the promo banner block in this section sits between the recipe rows
  const promoWrapper = section?.querySelector('.promo-banner-wrapper');
  let promo = null;
  if (promoWrapper) {
    promo = document.createElement('li');
    promo.className = 'recipes-promo';
    promo.append(promoWrapper);
  }

  const status = document.createElement('p');
  status.className = 'recipes-status';
  status.setAttribute('role', 'status');

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'button primary recipes-more';
  more.textContent = 'Load More';

  let filters;
  const matching = () => {
    const category = section?.dataset.recipeCategory?.toLowerCase();
    return recipes.filter((r) => (!category || r.category?.toLowerCase() === category)
      && Object.entries(filters?.selected || {}).every(([key, set]) => !set.size
        || valuesOf(r[key]).some((v) => set.has(v))));
  };

  const render = (focusFrom = -1) => {
    const matches = matching();
    const items = matches.slice(0, shown).map((recipe) => {
      const li = indexedCard(recipe);
      addCardMenu(li, recipe, popups);
      return li;
    });
    if (!items.length) items.push(emptyState('No recipes match these filters yet.'));
    if (promo) items.splice(Math.min(PROMO_AFTER, items.length), 0, promo);
    list.replaceChildren(...items);
    more.hidden = matches.length <= shown;
    status.textContent = matches.length
      ? `Showing ${Math.min(shown, matches.length)} of ${matches.length} recipes`
      : 'No recipes match these filters';
    // after "Load More", continue from the first new recipe
    if (focusFrom >= 0) list.querySelectorAll('.recipes-card')[focusFrom]?.focus();
  };

  filters = buildFilters(recipes, popups, () => {
    shown = PAGE_SIZE;
    filters.updateCount();
    render();
  });

  more.addEventListener('click', () => {
    const from = shown;
    shown += PAGE_SIZE;
    render(from);
  });
  section?.addEventListener('recipes:filter', () => {
    shown = PAGE_SIZE;
    render();
  });

  render();
  block.replaceChildren(...[filters?.element, status, list, more].filter(Boolean));
}
