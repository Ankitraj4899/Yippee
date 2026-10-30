import openShare from '../../scripts/share.js';

// the three-dot Share / Download menu on recipe cards, shared by the slider and the grid

let uid = 0;

/**
 * Keeps at most one pop-up (filter panel or card menu) open, and closes it on
 * Escape or a click outside. One set of document listeners per block, so cards
 * can be rebuilt freely.
 */
export function popupController() {
  let current = null;
  const close = (refocus = false) => {
    if (!current) return;
    const { setOpen } = current;
    current = null;
    setOpen(false, refocus);
  };
  document.addEventListener('click', (e) => {
    if (current && !current.inside.some((el) => el.contains(e.target))) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current) close(true);
  });
  return {
    open(setOpen, ...inside) {
      close();
      current = { setOpen, inside };
      setOpen(true);
    },
    close,
    isOpen: (setOpen) => current?.setOpen === setOpen,
  };
}

/**
 * Share / Download menu behind the three dots on a card.
 * @param {HTMLLIElement} li The card item
 * @param {object} recipe The recipe index row
 * @param {ReturnType<popupController>} popups The block's pop-up controller
 */
export function addCardMenu(li, recipe, popups) {
  uid += 1;
  const menuId = `recipes-menu-${uid}`;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'recipes-menu-toggle';
  toggle.setAttribute('aria-label', `More options for ${recipe.title}`);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', menuId);

  const menu = document.createElement('div');
  menu.className = 'recipes-menu';
  menu.id = menuId;
  menu.hidden = true;

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'recipes-menu-share';
  share.textContent = 'Share';
  share.addEventListener('click', () => {
    // focus the three dots first, so closing the Share pop-up comes back to them
    popups.close(true);
    openShare({ url: recipe.path, title: recipe.title });
  });
  menu.append(share);

  const hasPhoto = recipe.image && !recipe.image.startsWith('/default-meta-image');
  if (hasPhoto) {
    const download = document.createElement('a');
    download.className = 'recipes-menu-download';
    download.href = `${recipe.image.split('?')[0]}?width=1200&format=jpg&optimize=medium`;
    download.download = `${recipe.path.split('/').pop()}.jpg`;
    download.textContent = 'Download';
    menu.append(download);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'recipes-menu-close';
  close.setAttribute('aria-label', 'Close menu');
  menu.append(close);

  const setOpen = (open, refocus = false) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', open);
    if (open) share.focus();
    if (!open && refocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    if (popups.isOpen(setOpen)) popups.close();
    else popups.open(setOpen, menu, toggle);
  });
  close.addEventListener('click', () => popups.close(true));

  li.classList.add('recipes-item-has-menu');
  li.append(toggle, menu);
}
