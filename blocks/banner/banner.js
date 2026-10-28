import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import openVideoModal from '../../scripts/video-modal.js';

function optimize(picture, className) {
  const img = picture.querySelector('img');
  const optimized = createOptimizedPicture(img.src, img.alt, false, [
    { media: '(min-width: 900px)', width: '1600' },
    { width: '750' },
  ]);
  moveInstrumentation(img, optimized.querySelector('img'));
  optimized.classList.add(className);
  return optimized;
}

export default function decorate(block) {
  const [imageRow, overlayRow, videoRow] = [...block.children];
  const media = document.createElement('div');
  media.className = 'banner-media';

  const picture = imageRow?.querySelector('picture');
  if (picture) media.append(optimize(picture, 'banner-image'));
  const overlay = overlayRow?.querySelector('picture');
  if (overlay) media.append(optimize(overlay, 'banner-overlay'));

  const link = videoRow?.querySelector('a');
  if (link) {
    const play = document.createElement('a');
    play.className = 'banner-play';
    play.href = link.href;
    play.setAttribute('aria-label', 'Play video');
    moveInstrumentation(link, play);
    play.addEventListener('click', (e) => {
      e.preventDefault();
      openVideoModal(link.href, picture?.querySelector('img')?.alt || 'Video');
    });
    media.append(play);
  }

  block.replaceChildren(media);
}
