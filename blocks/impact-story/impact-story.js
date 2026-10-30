import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';
import openVideoModal from '../../scripts/video-modal.js';

/** The element with the most text. */
const longest = (els) => els.reduce((best, el) => (
  el.textContent.trim().length > (best?.textContent.trim().length || 0) ? el : best), null);

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/** A row holding nothing but one link (the video), possibly wrapped in a paragraph. */
const isOnlyLink = (el) => {
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
};

/**
 * A programme of the Better World initiative: an image (or video thumbnail with a play
 * button) beside a title, text and key figures.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children];
  // AEM can leave out empty fields, so rows are told apart by what they hold: the figures
  // are the items (a figure and its label), the block's own fields are one-cell rows
  const stats = rows.filter((row) => row.children.length > 1);
  const fields = rows.filter((row) => !stats.includes(row));
  const imageRow = fields.find(isImage);
  const rest = fields.filter((row) => row !== imageRow && row.textContent.trim());
  const videoRow = rest.find(isOnlyLink);
  const words = rest.filter((row) => row !== videoRow);
  const textRow = words.length > 1 ? longest(words) : null;
  const titleRow = words.find((row) => row !== textRow);

  const content = document.createElement('div');
  content.className = 'impact-story-content';
  const titleText = titleRow?.textContent.trim();
  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'impact-story-title';
    title.textContent = titleText;
    moveInstrumentation(titleRow.firstElementChild || titleRow, title);
    content.append(title);
  }
  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    const text = document.createElement('div');
    text.className = 'impact-story-text';
    moveInstrumentation(textCell, text);
    text.append(...textCell.childNodes);
    content.append(text);
  }
  if (stats.length) {
    const list = document.createElement('ul');
    list.className = 'impact-story-stats';
    stats.forEach((row) => {
      const [valueCell, labelCell] = [...row.children];
      const li = document.createElement('li');
      moveInstrumentation(row, li);
      const value = document.createElement('span');
      value.className = 'impact-story-stat-value';
      value.textContent = valueCell.textContent.trim();
      const label = document.createElement('span');
      label.className = 'impact-story-stat-label';
      label.textContent = labelCell.textContent.trim();
      li.append(value, label);
      list.append(li);
    });
    content.append(list);
  }

  const media = document.createElement('div');
  media.className = 'impact-story-media';
  const picture = optimizedPicture(imageRow?.firstElementChild || imageRow, '1060');
  if (picture) media.append(picture);
  const video = videoRow?.querySelector('a[href]');
  if (video) {
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'impact-story-play';
    const name = titleText || picture?.querySelector('img')?.alt || 'Video';
    play.setAttribute('aria-label', `Play video: ${name}`);
    moveInstrumentation(video, play);
    play.addEventListener('click', () => openVideoModal(video.href, name));
    media.append(play);
  }

  block.replaceChildren(content, media);
}
