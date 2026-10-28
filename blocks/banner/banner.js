import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

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

/**
 * Plays an MP4 video in a modal dialog.
 * @param {string} src The video URL
 * @param {string} label Accessible name of the dialog
 */
function openVideo(src, label) {
  const dialog = document.createElement('dialog');
  dialog.className = 'banner-dialog';
  dialog.setAttribute('aria-label', label);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'banner-dialog-close';
  close.setAttribute('aria-label', 'Close video');
  close.addEventListener('click', () => dialog.close());
  const video = document.createElement('video');
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.src = src;
  dialog.append(close, video);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
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
    const isYoutube = /youtube\.com|youtu\.be/.test(link.href);
    if (isYoutube) {
      play.target = '_blank';
      play.rel = 'noopener noreferrer';
    } else {
      play.addEventListener('click', (e) => {
        e.preventDefault();
        openVideo(link.href, picture?.querySelector('img')?.alt || 'Video');
      });
    }
    media.append(play);
  }

  block.replaceChildren(media);
}
