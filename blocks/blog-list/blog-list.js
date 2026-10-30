import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { formatDate, dateValue } from '../../scripts/blog-helpers.js';

const FOLDER = '/blog-listing/';
const DEFAULT_SOURCE = '/query-index.json';

const ICONS = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></g></svg>',
  filters: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1M15 4v4M9 10v4M17 16v4"/></svg>',
  sort: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 20V4M4 8l4-4 4 4m4-4v16m4-4-4 4-4-4"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m6 6 12 12M18 6 6 18"/></svg>',
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

/** Index rows of the blog articles, newest first. */
async function loadBlogs(source) {
  try {
    const res = await fetch(source);
    const json = res.ok ? await res.json() : { data: [] };
    return (json.data || [])
      .filter((row) => row.path?.startsWith(FOLDER) && (row.pagetitle || row.title))
      .map((row) => ({ ...row, name: (row.pagetitle || row.title).split(' | ')[0].trim() }));
  } catch {
    return [];
  }
}

/** A blog card: image, topic and reading time, title, summary and date, all one link. */
function card(blog) {
  const li = el('li', 'blog-list-item');
  const link = el('a', 'blog-list-card');
  link.href = blog.path;
  const media = el('div', 'blog-list-media');
  if (blog.image) {
    // index images are paths on this site; outside images (local tests) are used as they are
    const picture = blog.image.startsWith('/')
      ? createOptimizedPicture(blog.image, '', false, [{ width: '616' }])
      : Object.assign(el('picture'), { innerHTML: '<img loading="lazy" alt="">' });
    const img = picture.querySelector('img');
    if (!blog.image.startsWith('/')) img.src = blog.image;
    img.alt = '';
    media.append(picture);
  }
  const body = el('div', 'blog-list-body');
  const meta = el('p', 'blog-list-meta');
  if (blog.topic) meta.append(el('span', 'blog-list-topic', blog.topic));
  if (blog.readtime) meta.append(el('span', 'blog-list-readtime', blog.readtime));
  const title = el('h3', 'blog-list-title', blog.name);
  body.append(meta, title);
  if (blog.description) body.append(el('p', 'blog-list-description', blog.description));
  if (blog.published) {
    const date = el('time', 'blog-list-date', formatDate(blog.published));
    date.dateTime = blog.published.slice(0, 10);
    body.append(date);
  }
  link.append(media, body);
  li.append(link);
  return li;
}

/** A Filters / Sort button and the pop-up it opens. */
function popover(name, label, icon, heading) {
  const wrap = el('div', `blog-list-control blog-list-${name}`);
  const button = el('button', 'blog-list-control-button');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `blog-list-${name}-panel`);
  button.innerHTML = `<span class="blog-list-count"></span><span>${label}</span>${icon}`;
  const panel = el('div', 'blog-list-panel');
  panel.id = `blog-list-${name}-panel`;
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', heading);
  const head = el('div', 'blog-list-panel-head');
  head.append(el('p', 'blog-list-panel-title', heading));
  const close = el('button', 'blog-list-panel-close');
  close.type = 'button';
  close.setAttribute('aria-label', `Close ${heading}`);
  close.innerHTML = ICONS.close;
  head.append(close);
  const options = el('fieldset', 'blog-list-options');
  options.append(Object.assign(el('legend', 'blog-list-legend'), { textContent: heading }));
  const clear = el('button', 'button secondary blog-list-clear', 'Clear All');
  clear.type = 'button';
  panel.append(head, options, clear);
  wrap.append(button, panel);

  const setOpen = (open) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', open);
    if (open) options.querySelector('input')?.focus();
  };
  button.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => {
    setOpen(false);
    button.focus();
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  return {
    wrap, button, options, clear, setOpen,
  };
}

/**
 * Blog listing: every article under /blog-listing/ from the query index as a card, with
 * a search box that suggests titles, a topic filter and newest/oldest sorting.
 * @param {Element} block The block
 */
export default async function decorate(block) {
  const rows = [...block.children];
  // block fields: the heading, then (optionally) the index to read
  const titleRow = rows.find((row) => row.textContent.trim() && !/\.json(\?|$)/.test(row.textContent.trim()));
  const sourceRow = rows.find((row) => /\.json(\?|$)/.test(row.textContent.trim()));
  const source = sourceRow?.textContent.trim() || DEFAULT_SOURCE;

  const heading = el('h2', 'blog-list-heading', titleRow?.textContent.trim() || 'Explore All Blogs');
  if (titleRow) moveInstrumentation(titleRow.firstElementChild || titleRow, heading);

  // search box with suggestions (a combobox)
  const tools = el('div', 'blog-list-tools');
  const search = el('div', 'blog-list-search');
  search.setAttribute('role', 'search');
  const input = el('input', 'blog-list-input');
  Object.assign(input, { type: 'search', placeholder: 'Search for a topic', autocomplete: 'off' });
  input.setAttribute('aria-label', 'Search for a topic');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'blog-list-suggestions');
  const suggestions = el('ul', 'blog-list-suggestions');
  suggestions.id = 'blog-list-suggestions';
  suggestions.setAttribute('role', 'listbox');
  suggestions.setAttribute('aria-label', 'Suggestions');
  suggestions.hidden = true;
  search.insertAdjacentHTML('afterbegin', ICONS.search);
  search.append(input, suggestions);

  const filters = popover('filters', 'Filters', ICONS.filters, 'Filters');
  const sort = popover('sort', 'Sort', ICONS.sort, 'Sort By');
  const controls = el('div', 'blog-list-controls');
  controls.append(filters.wrap, sort.wrap);
  tools.append(search, controls);

  const status = el('p', 'blog-list-status');
  status.setAttribute('role', 'status');
  const list = el('ul', 'blog-list-grid');
  block.replaceChildren(heading, tools, status, list);

  const blogs = await loadBlogs(source);
  const state = { query: '', topics: new Set(), order: 'newest' };

  // topic checkboxes and sort radios
  const topics = [...new Set(blogs.map((b) => b.topic).filter(Boolean))].sort();
  topics.forEach((topic) => {
    const label = el('label', 'blog-list-option');
    const box = Object.assign(el('input'), { type: 'checkbox', value: topic });
    label.append(box, el('span', '', topic));
    filters.options.append(label);
  });
  [['newest', 'Newest First'], ['oldest', 'Oldest First']].forEach(([value, text]) => {
    const label = el('label', 'blog-list-option');
    const radio = Object.assign(el('input'), {
      type: 'radio', name: 'blog-list-sort', value, checked: value === 'newest',
    });
    label.append(radio, el('span', '', text));
    sort.options.append(label);
  });

  const matches = (blog) => {
    const q = state.query.toLowerCase();
    return (!q || `${blog.name} ${blog.description || ''} ${blog.topic || ''}`.toLowerCase().includes(q))
      && (!state.topics.size || state.topics.has(blog.topic));
  };
  const render = () => {
    const shown = blogs.filter(matches).sort((a, b) => {
      const diff = dateValue(b.published) - dateValue(a.published);
      return state.order === 'newest' ? diff : -diff;
    });
    list.replaceChildren(...shown.map(card));
    status.textContent = shown.length ? '' : 'No blogs match your search. Try another word or clear the filters.';
    filters.button.querySelector('.blog-list-count').textContent = state.topics.size ? `(${state.topics.size})` : '';
    filters.clear.disabled = !state.topics.size;
    sort.clear.disabled = state.order === 'newest';
  };

  filters.options.addEventListener('change', (e) => {
    if (e.target.checked) state.topics.add(e.target.value);
    else state.topics.delete(e.target.value);
    render();
  });
  filters.clear.addEventListener('click', () => {
    state.topics.clear();
    filters.options.querySelectorAll('input').forEach((box) => { box.checked = false; });
    render();
  });
  sort.options.addEventListener('change', (e) => {
    state.order = e.target.value;
    render();
  });
  sort.clear.addEventListener('click', () => {
    state.order = 'newest';
    sort.options.querySelector('input[value="newest"]').checked = true;
    render();
  });

  // suggestions: titles containing the words typed, the match highlighted
  let active = -1;
  const options = () => [...suggestions.children];
  const closeSuggestions = () => {
    suggestions.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const highlight = (index) => {
    options().forEach((option, i) => option.setAttribute('aria-selected', i === index));
    active = index;
    if (index >= 0) input.setAttribute('aria-activedescendant', options()[index].id);
  };
  const suggest = () => {
    const q = input.value.trim().toLowerCase();
    const found = q ? blogs.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 6) : [];
    suggestions.replaceChildren(...found.map((blog, i) => {
      const option = el('li', 'blog-list-suggestion');
      option.id = `blog-list-suggestion-${i}`;
      option.setAttribute('role', 'option');
      const at = blog.name.toLowerCase().indexOf(q);
      option.append(
        blog.name.slice(0, at),
        el('mark', '', blog.name.slice(at, at + q.length)),
        blog.name.slice(at + q.length),
      );
      option.addEventListener('mousedown', (e) => e.preventDefault());
      option.addEventListener('click', () => { window.location.href = blog.path; });
      return option;
    }));
    suggestions.hidden = !found.length;
    input.setAttribute('aria-expanded', String(Boolean(found.length)));
    highlight(-1);
  };
  input.addEventListener('input', () => {
    suggest();
    // clearing the box shows every blog again
    if (!input.value.trim() && state.query) {
      state.query = '';
      render();
    }
  });
  input.addEventListener('keydown', (e) => {
    const count = options().length;
    if (e.key === 'ArrowDown' && count) {
      e.preventDefault();
      if (suggestions.hidden) suggest();
      highlight((active + 1) % count);
    } else if (e.key === 'ArrowUp' && count) {
      e.preventDefault();
      highlight((active - 1 + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && !suggestions.hidden) {
        options()[active].click();
        return;
      }
      // Enter searches the cards
      state.query = input.value.trim();
      closeSuggestions();
      render();
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });
  input.addEventListener('blur', closeSuggestions);

  render();
}
