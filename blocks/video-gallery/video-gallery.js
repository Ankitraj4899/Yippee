import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';
import openVideoModal from '../../scripts/video-modal.js';
import { optimizedPicture, sectionLabel } from '../../scripts/block-helpers.js';

export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'video-gallery-list';

  [...block.children].forEach((row) => {
    const [imageCell, videoCell] = [...row.children];
    const li = document.createElement('li');
    li.className = 'video-gallery-item';
    moveInstrumentation(row, li);

    const link = videoCell?.querySelector('a[href]');
    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'video-gallery-card';
    const picture = optimizedPicture(imageCell, '612');
    if (picture) card.append(picture);
    if (link) {
      const title = link.textContent.trim();
      const name = title && title !== link.href ? title : picture?.querySelector('img')?.alt;
      card.href = link.href;
      card.setAttribute('aria-label', name ? `Play video: ${name}` : 'Play video');
      moveInstrumentation(link, card);
      card.addEventListener('click', (e) => {
        e.preventDefault();
        openVideoModal(link.href, name || 'Video');
      });
    }
    li.append(card);
    list.append(li);
  });

  const slider = document.createElement('div');
  slider.className = 'video-gallery-slider';
  slider.append(list);
  block.replaceChildren(slider);
  await createSlider(slider, list, sectionLabel(block, 'Videos'));
}
