import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';
import openVideoModal from '../../scripts/video-modal.js';

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/**
 * Video choices, each a picture with a play button under it that opens the video pop-up
 * (e.g. the chopsticks levels).
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'video-picks-list';
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const video = cells.find((c) => c !== imageCell && c.querySelector('a[href]'))?.querySelector('a[href]');

    const li = document.createElement('li');
    li.className = 'video-picks-item';
    moveInstrumentation(row, li);
    const picture = optimizedPicture(imageCell, '612');
    if (picture) li.append(picture);
    if (video) {
      const name = picture?.querySelector('img')?.alt || 'Video';
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'video-picks-play';
      play.setAttribute('aria-label', `Play video: ${name}`);
      moveInstrumentation(video, play);
      play.addEventListener('click', () => openVideoModal(video.href, name));
      li.append(play);
    }
    list.append(li);
  });
  block.replaceChildren(list);
}
