import { loadCSS } from './aem.js';

const ICONS = {
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4zm12.6 3 2.4-2.4-1.1-1.1-2.4 2.4-2.4-2.4-1.1 1.1 2.4 2.4-2.4 2.4 1.1 1.1 2.4-2.4 2.4 2.4 1.1-1.1z"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z"/></svg>',
};

/**
 * Returns the YouTube embed URL for a YouTube link, or null.
 * @param {string} url The video link
 */
function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.endsWith('youtu.be')) id = u.pathname.slice(1);
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || u.pathname.split('/embed/')[1] || '';
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` : null;
  } catch (e) {
    return null;
  }
}

function button(className, label, html = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  b.innerHTML = html;
  return b;
}

/**
 * Builds the custom player for an MP4 video.
 * @param {HTMLElement} player The player container
 * @param {string} src The video URL
 * @param {string} title The video title
 */
function buildVideoPlayer(player, src, title) {
  const video = document.createElement('video');
  video.src = src;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', title);

  const toggle = button('video-modal-toggle', 'Pause video');
  const controls = document.createElement('div');
  controls.className = 'video-modal-controls';
  const progress = document.createElement('input');
  progress.type = 'range';
  progress.className = 'video-modal-progress';
  progress.min = '0';
  progress.max = '1000';
  progress.value = '0';
  progress.setAttribute('aria-label', 'Seek');
  const actions = document.createElement('div');
  actions.className = 'video-modal-actions';
  const mute = button('video-modal-mute', 'Mute', ICONS.volume);
  const full = button('video-modal-fullscreen', 'Full screen', ICONS.fullscreen);
  actions.append(mute, full);
  controls.append(progress, actions);
  player.append(video, toggle, controls);

  const setState = () => {
    player.classList.toggle('is-playing', !video.paused);
    toggle.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
  };
  const togglePlay = () => (video.paused ? video.play() : video.pause());
  toggle.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
  video.addEventListener('play', setState);
  video.addEventListener('pause', setState);
  video.addEventListener('ended', setState);
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    progress.value = String(Math.round(pct * 10));
    progress.style.setProperty('--progress', `${pct}%`);
  });
  progress.addEventListener('input', () => {
    if (video.duration) video.currentTime = (Number(progress.value) / 1000) * video.duration;
  });
  mute.addEventListener('click', () => {
    video.muted = !video.muted;
    mute.innerHTML = video.muted ? ICONS.muted : ICONS.volume;
    mute.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
  });
  full.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (player.requestFullscreen) player.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iOS Safari
  });
  // browsers may block autoplay with sound: start muted in that case
  video.play()?.catch(() => {
    video.muted = true;
    mute.innerHTML = ICONS.muted;
    video.play()?.catch(() => setState());
  });
  return video;
}

/**
 * Opens a video (MP4 or YouTube) in the YiPPee! video modal.
 * @param {string} url The video URL
 * @param {string} [title] Accessible name for the video
 */
export default async function openVideoModal(url, title = 'Video') {
  const embed = youtubeEmbed(url);
  // links that are not a playable video (e.g. a YouTube channel page) open in a new tab
  const isVideoFile = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url) || url.includes('/is/content/');
  if (!embed && !isVideoFile) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  await loadCSS(`${window.hlx.codeBasePath}/styles/video-modal.css`);

  const dialog = document.createElement('dialog');
  dialog.className = 'video-modal';
  dialog.setAttribute('aria-label', title);
  const close = button('video-modal-close', 'Close video');
  const player = document.createElement('div');
  player.className = 'video-modal-player';
  dialog.append(close, player);

  let video = null;
  if (embed) {
    const iframe = document.createElement('iframe');
    iframe.src = embed;
    iframe.title = title;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.classList.add('is-embed');
    player.append(iframe);
  } else {
    video = buildVideoPlayer(player, url, title);
  }

  const opener = document.activeElement;
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    video?.pause();
    dialog.remove();
    opener?.focus?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  close.focus();
}
