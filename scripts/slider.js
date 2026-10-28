import { loadCSS } from './aem.js';

function createButton(className, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  return button;
}

/**
 * Turns a list of slides into a lightweight scroll-snap slider with
 * previous/next buttons and dot navigation. Works with any number of slides
 * and with slides hidden via the `hidden` attribute (e.g. by tabs).
 * @param {Element} container The element that will hold the slider controls
 * @param {Element} track The scrollable element whose children are the slides
 * @param {string} label Accessible name of the slider
 * @returns {Promise<{update: Function, goTo: Function}>} slider api
 */
export default async function createSlider(container, track, label = 'Carousel') {
  const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/styles/slider.css`);

  container.classList.add('slider');
  container.setAttribute('role', 'region');
  container.setAttribute('aria-roledescription', 'carousel');
  container.setAttribute('aria-label', label);
  track.classList.add('slider-track');

  const prev = createButton('slider-prev', 'Previous slide');
  const next = createButton('slider-next', 'Next slide');
  const dots = document.createElement('div');
  dots.className = 'slider-dots';
  container.append(prev, next, dots);

  const slides = () => [...track.children].filter((slide) => !slide.hidden);

  const stepWidth = () => {
    const [first, second] = slides();
    if (!first) return track.clientWidth || 1;
    if (second) return Math.abs(second.offsetLeft - first.offsetLeft) || first.offsetWidth;
    return first.offsetWidth || 1;
  };

  const positions = () => {
    const step = stepWidth();
    const perView = Math.max(1, Math.round(track.clientWidth / step));
    return Math.max(1, slides().length - perView + 1);
  };

  const current = () => Math.round(track.scrollLeft / stepWidth());

  const goTo = (index) => {
    const max = positions() - 1;
    const target = Math.min(Math.max(index, 0), max);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: target * stepWidth(), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const update = () => {
    const count = positions();
    const index = Math.min(current(), count - 1);
    if (dots.children.length !== count) {
      dots.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const dot = createButton('slider-dot', `Show slide ${i + 1} of ${count}`);
        dot.addEventListener('click', () => goTo(i));
        return dot;
      }));
    }
    [...dots.children].forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    prev.disabled = index <= 0;
    next.disabled = index >= count - 1;
    container.classList.toggle('slider-static', count < 2);
  };

  prev.addEventListener('click', () => goTo(current() - 1));
  next.addEventListener('click', () => goTo(current() + 1));

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }, { passive: true });

  if (window.ResizeObserver) new ResizeObserver(() => update()).observe(track);

  // Universal Editor: bring the slide selected in the content tree into view
  container.addEventListener('aue:ui-select', (e) => {
    if (!e.detail?.selected) return;
    const slide = slides().find((s) => s.contains(e.target));
    if (slide) goTo(slides().indexOf(slide));
  });

  await cssLoaded;
  update();
  return { update, goTo };
}
