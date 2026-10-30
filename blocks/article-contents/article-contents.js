import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * "In this article": numbered links to the article's sections, one for each heading
 * (h2) in the page's text after the block.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const titleCell = [...block.children].find((row) => row.textContent.trim())?.firstElementChild;
  const nav = document.createElement('nav');
  nav.setAttribute('aria-labelledby', 'article-contents-title');
  const title = document.createElement('h2');
  title.id = 'article-contents-title';
  title.className = 'article-contents-title';
  title.textContent = titleCell?.textContent.trim() || 'In this article';
  if (titleCell) moveInstrumentation(titleCell, title);

  const list = document.createElement('ol');
  const main = block.closest('main') || document;
  const all = [...main.querySelectorAll('.block, .default-content-wrapper h2')];
  const headings = all.slice(all.indexOf(block) + 1).filter((el) => el.tagName === 'H2');
  headings.forEach((heading) => {
    if (!heading.id) heading.id = toClassName(heading.textContent);
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    li.append(link);
    list.append(li);
  });

  nav.append(title, list);
  block.replaceChildren(nav);
  if (!headings.length) block.closest('.article-contents-wrapper')?.remove();
}
