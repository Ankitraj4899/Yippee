import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * A table of facts in an article: one row per item, the first row the column headings.
 * Scrolls sideways on small screens.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.textContent.trim());
  // a row's cells without the empty trailing ones (a two-column table leaves Column 3 empty)
  const cellsOf = (row) => {
    const cells = [...row.children];
    while (cells.length > 1 && !cells.at(-1).textContent.trim()) cells.pop();
    return cells;
  };
  // named by its column headings, read before the cells move into the table
  const label = cellsOf(rows[0] || block).map((c) => c.textContent.trim()).filter(Boolean).join(', ');
  const table = document.createElement('table');
  const columns = Math.max(...rows.map((row) => cellsOf(row).length), 1);
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    cellsOf(row).forEach((cell) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) td.scope = 'col';
      moveInstrumentation(cell, td);
      // a cell's single paragraph is just its text
      const only = cell.children.length === 1 && cell.firstElementChild.tagName === 'P';
      td.append(...(only ? cell.firstElementChild.childNodes : cell.childNodes));
      tr.append(td);
    });
    // rows with empty trailing fields still span the table
    const last = tr.lastElementChild;
    if (last && tr.children.length < columns) last.colSpan = columns - tr.children.length + 1;
    if (i === 0) {
      const head = document.createElement('thead');
      head.append(tr);
      table.append(head);
    } else {
      if (!table.tBodies.length) table.append(document.createElement('tbody'));
      table.tBodies[0].append(tr);
    }
  });
  const scroller = document.createElement('div');
  scroller.className = 'data-table-scroller';
  scroller.tabIndex = 0;
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('aria-label', label ? `Table: ${label}` : 'Table');
  scroller.append(table);
  block.replaceChildren(scroller);
}
