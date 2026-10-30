/**
 * A recipe's other headed parts after the method (e.g. Serving Suggestion and Chef's
 * Tips), each in a card.
 * @param {Element} block The block
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.className = 'recipe-notes-card';
    const cell = row.firstElementChild;
    if (cell) row.replaceChildren(...cell.childNodes);
  });
}
