import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import createSlider from '../../scripts/slider.js';

/**
 * Adds a play button linking to the slide's video.
 * @param {Element} media The slide image container
 * @param {Element} link The authored video link
 * @param {string} title The slide heading, used for the accessible name
 */
function addPlayButton(media, link, title) {
  const play = document.createElement('a');
  play.className = 'carousel-play';
  play.href = link.href;
  play.target = '_blank';
  play.rel = 'noopener noreferrer';
  play.setAttribute('aria-label', title ? `Play video: ${title}` : 'Play video');
  moveInstrumentation(link, play);
  media.append(play);
}

export default async function decorate(block) {
  const slides = document.createElement('ul');
  slides.className = 'carousel-slides';

  [...block.children].forEach((row, index) => {
    const slide = document.createElement('li');
    slide.className = 'carousel-slide';
    slide.setAttribute('aria-roledescription', 'slide');
    moveInstrumentation(row, slide);

    const [imageCell, textCell, videoCell] = [...row.children];
    const picture = imageCell?.querySelector('picture');
    let media;
    if (picture) {
      media = document.createElement('div');
      media.className = 'carousel-slide-image';
      const img = picture.querySelector('img');
      // the first slide is the LCP candidate, the others can load lazily
      const optimized = createOptimizedPicture(img.src, img.alt, index === 0, [
        { media: '(min-width: 600px)', width: '900' },
        { width: '600' },
      ]);
      moveInstrumentation(img, optimized.querySelector('img'));
      media.append(optimized);
      slide.append(media);
    }

    if (textCell && textCell.textContent.trim()) {
      textCell.className = 'carousel-slide-content';
      slide.append(textCell);
    }

    const videoLink = videoCell?.querySelector('a');
    if (media && videoLink) {
      const title = textCell?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim();
      addPlayButton(media, videoLink, title);
    }

    slide.setAttribute('aria-label', `${index + 1} of ${block.children.length}`);
    slides.append(slide);
  });

  block.replaceChildren(slides);
  await createSlider(block, slides, 'Highlights');
}
