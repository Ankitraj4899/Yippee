import { loadFragment } from '../fragment/fragment.js';

/**
 * The extras every recipe page ends with (the /fragments/recipe-more page, e.g. the
 * share banner and "You may also want to try"): its sections take this block's place.
 * @param {Element} block The block
 */
export default async function decorate(block) {
  const section = block.closest('.section');
  const path = block.textContent.trim();
  const fragment = await loadFragment(path);
  const sections = fragment ? [...fragment.querySelectorAll(':scope > .section')] : [];
  sections.forEach((s) => s.classList.add('recipe-more'));
  if (sections.length) section.after(...sections);
  section.remove();
}
