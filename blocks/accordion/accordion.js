import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Questions that open to show their answers (e.g. an article's FAQs); the first one
 * starts open.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const items = [...block.children].filter((row) => row.textContent.trim()).map((row, i) => {
    const [questionCell, answerCell] = [...row.children];
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.open = i === 0;
    moveInstrumentation(row, details);
    const summary = document.createElement('summary');
    summary.className = 'accordion-question';
    summary.textContent = questionCell?.textContent.trim() || '';
    if (questionCell) moveInstrumentation(questionCell, summary);
    const answer = document.createElement('div');
    answer.className = 'accordion-answer';
    if (answerCell) {
      moveInstrumentation(answerCell, answer);
      answer.append(...answerCell.childNodes);
    }
    details.append(summary, answer);
    return details;
  });
  block.replaceChildren(...items);
}
