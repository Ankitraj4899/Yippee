import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';
import openVideoModal from '../../scripts/video-modal.js';

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/** AEM can leave out empty fields, so rows are told apart by what they hold. */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/** A row holding nothing but one link (the video), possibly wrapped in a paragraph. */
const isOnlyLink = (el) => {
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
};

/**
 * Title and text beside a square image, optionally a video thumbnail with a
 * play button that opens the video pop-up.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const imageRow = rows.find(isImage);
  const rest = rows.filter((row) => row !== imageRow && row.textContent.trim());
  const videoRow = rest.find(isOnlyLink);
  const words = rest.filter((row) => row !== videoRow);
  // the text is the longest, the title the other one (either may come wrapped in a paragraph)
  const textRow = words.length > 1 ? longest(words) : null;
  const titleRow = words.find((row) => row !== textRow);

  const content = document.createElement('div');
  content.className = 'story-banner-content';
  const titleText = titleRow?.textContent.trim();
  if (titleText) {
    // a title authored as h1 (Title Type) is the page heading
    const pageHeading = Boolean(titleRow.querySelector('h1'));
    block.classList.toggle('page-heading', pageHeading);
    const title = document.createElement(pageHeading ? 'h1' : 'h2');
    title.className = 'story-banner-title';
    title.textContent = titleText;
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.append(title);
  }
  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    const text = document.createElement('div');
    text.className = 'story-banner-text';
    moveInstrumentation(textCell, text);
    text.append(...textCell.childNodes);
    content.append(text);
  }

  const media = document.createElement('div');
  media.className = 'story-banner-media';
  const picture = optimizedPicture(imageRow?.firstElementChild || imageRow, '936');
  if (picture) media.append(picture);
  const video = videoRow?.querySelector('a[href]');
  if (video) {
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'story-banner-play';
    const name = titleText || picture?.querySelector('img')?.alt || 'Video';
    play.setAttribute('aria-label', `Play video: ${name}`);
    moveInstrumentation(video, play);
    play.addEventListener('click', () => openVideoModal(video.href, name));
    media.append(play);
  }

  block.replaceChildren(content, media);
}
