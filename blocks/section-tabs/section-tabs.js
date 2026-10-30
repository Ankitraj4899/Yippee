import { toClassName } from '../../scripts/aem.js';
import { sectionLabel } from '../../scripts/block-helpers.js';

/**
 * Tabs over the sections that follow the block's section: each following section with
 * a Tab Label becomes (part of) a tab panel; sections with the same label share a tab.
 * The first section without a Tab Label ends the tabs.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const section = block.closest('.section');
  const groups = new Map();
  let next = section?.nextElementSibling;
  while (next?.dataset.tab?.trim()) {
    const name = next.dataset.tab.trim();
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(next);
    next = next.nextElementSibling;
  }

  const tablist = document.createElement('div');
  tablist.className = 'section-tabs-list';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', block.textContent.trim() || sectionLabel(block, 'Tabs'));

  const tabs = [];
  const panels = [];
  [...groups].forEach(([name, sections]) => {
    const id = toClassName(name);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'section-tabs-tab';
    tab.id = `${id}-tab`;
    tab.textContent = name;
    tab.setAttribute('role', 'tab');
    sections.forEach((panel, i) => {
      panel.id = panel.id || (i ? `${id}-${i}` : id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
    });
    tab.setAttribute('aria-controls', sections.map((panel) => panel.id).join(' '));
    tabs.push(tab);
    panels.push(sections);
    tablist.append(tab);
  });

  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      panels[i].forEach((panel) => { panel.hidden = !selected; });
    });
    if (focus) tabs[index].focus();
  };

  tablist.addEventListener('click', (e) => {
    const index = tabs.indexOf(e.target.closest('.section-tabs-tab'));
    if (index >= 0) select(index);
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

  // a link to a panel (e.g. #school) opens its tab
  const fromHash = panels.findIndex((sections) => sections.some((panel) => `#${panel.id}` === window.location.hash));
  if (tabs.length) select(Math.max(fromHash, 0));

  // in the Universal Editor, show the tab of whatever the author selects
  document.addEventListener('aue:ui-select', (e) => {
    const resource = e.detail?.resource;
    const el = resource && document.querySelector(`[data-aue-resource="${resource}"]`);
    const index = panels.findIndex((sections) => sections.some((panel) => panel.contains(el)));
    if (index >= 0) select(index);
  });

  block.replaceChildren(tablist);
}
