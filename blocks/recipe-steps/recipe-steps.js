/**
 * A recipe's method (built from the list under its Method heading): STEP 1, STEP 2…,
 * each with a box to tick off when done.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = block.querySelector('ol, ul');
  if (!list) return;
  const steps = document.createElement('ol');
  steps.className = 'recipe-steps-list';
  [...list.children].forEach((li, i) => {
    const item = document.createElement('li');
    item.className = 'recipe-steps-item';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `recipe-step-${i + 1}`;
    box.className = 'recipe-steps-check';
    const label = document.createElement('label');
    label.htmlFor = box.id;
    label.className = 'recipe-steps-label';
    label.innerHTML = `<span class="recipe-steps-number">Step ${i + 1}</span>`;
    const text = document.createElement('div');
    text.className = 'recipe-steps-text';
    // keep the authored step (and its editor instrumentation) as it is
    [...li.attributes].forEach(({ name, value }) => text.setAttribute(name, value));
    text.append(...li.childNodes);
    label.append(text);
    item.append(box, label);
    steps.append(item);
  });
  block.replaceChildren(steps);
}
