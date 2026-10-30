// the search bar that opens under the navbar, with results from the site's query index

const INDEX = '/query-index.json';
const MIN_LENGTH = 3;
const isDesktop = window.matchMedia('(min-width: 900px)');
// pages that are parts of other pages, not results
const HIDDEN = /^\/(nav|footer|fragments)(\/|$)/;
// shown when nothing matches, like the original
const CATEGORIES = [
  ['Pasta', '/product-listing#explore-our-pasta-range'],
  ['Noodles', '/product-listing#explore-our-noodles-range'],
  ['Ramen', '/product-listing#explore-our-korean-noodles-range'],
  ['Saucy', '/product-listing'],
  ['Spicy', '/product-listing'],
  ['Snacks', '/recipes?category=snacks'],
];

let pages;

/** Searchable pages from the query index, loaded on the first search. */
function loadPages() {
  if (!pages) {
    pages = fetch(`${INDEX}?limit=1000`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then(({ data = [] }) => data
        .filter((row) => !HIDDEN.test(row.path) && !/noindex/i.test(row.robots || ''))
        .map((row) => {
          const label = row.title || (row.pagetitle || '').replace(/\s*\|[^|]*$/, '');
          const {
            pagetitle, description, category, products, topic,
          } = row;
          const text = [label, pagetitle, description, category, products, topic]
            .filter(Boolean).join(' ').toLowerCase();
          return { path: row.path, label: label.trim(), text };
        })
        .filter((page) => page.label))
      .catch(() => []);
  }
  return pages;
}

/** Pages containing every word of the query, those with it in the title first. */
function find(all, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const q = query.toLowerCase().trim();
  return all
    .filter((page) => words.every((w) => page.text.includes(w)))
    .map((page) => ({ page, rank: page.label.toLowerCase().includes(q) ? 0 : 1 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ page }) => page);
}

/**
 * Turns the navbar's Search link into a button that opens the search bar.
 * @param {Element} link The Search link in the nav tools
 * @param {Element} navWrapper The element the search bar is added to
 */
export default function decorateSearch(link, navWrapper) {
  const panel = document.createElement('div');
  panel.className = 'nav-search';
  panel.id = 'nav-search';
  panel.hidden = true;
  panel.innerHTML = `
    <form class="nav-search-form" role="search">
      <button type="button" class="nav-search-close" aria-label="Close search"></button>
      <input class="nav-search-input" type="text" name="q" placeholder="Start Typing..." autocomplete="off"
        aria-label="Search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="nav-search-results">
      <button type="submit" class="nav-search-submit" aria-label="Search"></button>
    </form>
    <div class="nav-search-results" id="nav-search-results" role="listbox" aria-label="Search results" hidden></div>
    <p class="nav-search-status" role="status"></p>`;
  navWrapper.append(panel);

  const form = panel.querySelector('form');
  const input = panel.querySelector('.nav-search-input');
  const results = panel.querySelector('.nav-search-results');
  const status = panel.querySelector('.nav-search-status');
  let options = [];
  let active = -1;

  link.setAttribute('role', 'button');
  link.setAttribute('aria-expanded', 'false');
  link.setAttribute('aria-controls', panel.id);

  const setActive = (index) => {
    options.forEach((option, i) => option.setAttribute('aria-selected', i === index));
    active = index;
    if (index >= 0) {
      input.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const showResults = (show) => {
    results.hidden = !show;
    input.setAttribute('aria-expanded', show && options.length > 0);
  };

  const noResults = () => {
    const box = document.createElement('div');
    box.className = 'nav-search-empty';
    box.innerHTML = `<p class="nav-search-empty-title">Sorry, we cannot find what you are looking for :(</p>
      <p>Please try a new search term or browse through one of our product categories.</p>`;
    const tabs = document.createElement('p');
    tabs.className = 'nav-search-categories';
    CATEGORIES.forEach(([label, href]) => {
      const a = document.createElement('a');
      a.className = 'nav-search-category';
      a.href = href;
      a.textContent = label;
      tabs.append(a);
    });
    box.append(tabs);
    return box;
  };

  let latest = 0;
  const search = async () => {
    const query = input.value.trim();
    latest += 1;
    const run = latest;
    if (query.length < MIN_LENGTH) {
      options = [];
      setActive(-1);
      results.replaceChildren();
      showResults(false);
      status.textContent = '';
      return;
    }
    const matches = find(await loadPages(), query);
    // a newer keystroke has started its own search
    if (run !== latest) return;
    const shown = matches.slice(0, isDesktop.matches ? 8 : 5);
    options = shown.map((page, i) => {
      const a = document.createElement('a');
      a.className = 'nav-search-item';
      a.id = `nav-search-option-${i}`;
      a.href = page.path;
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');
      a.tabIndex = -1;
      a.textContent = page.label;
      return a;
    });
    setActive(-1);
    results.replaceChildren(...(options.length ? options : [noResults()]));
    showResults(true);
    status.textContent = matches.length ? `${matches.length} results` : 'No results';
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    link.setAttribute('aria-expanded', open);
    navWrapper.classList.toggle('nav-search-open', open);
    if (open) {
      loadPages();
      input.focus();
    } else {
      input.value = '';
      search();
    }
  };

  link.addEventListener('click', (e) => {
    e.preventDefault();
    setOpen(panel.hidden);
  });
  panel.querySelector('.nav-search-close').addEventListener('click', () => {
    setOpen(false);
    link.focus();
  });

  input.addEventListener('input', search);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      const last = options.length - 1;
      if (e.key === 'ArrowDown') setActive(active < last ? active + 1 : 0);
      else setActive(active > 0 ? active - 1 : last);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      link.focus();
    }
  });

  // Enter opens the highlighted result, or the first one
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await search();
    const target = options[active] || options[0];
    if (target) window.location.href = target.href;
  });

  // a click outside the search bar closes the results (the bar stays open)
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !link.contains(e.target)) showResults(false);
  });
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= MIN_LENGTH && results.children.length) showResults(true);
  });
}
