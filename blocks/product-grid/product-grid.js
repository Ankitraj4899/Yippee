import { moveInstrumentation } from '../../scripts/scripts.js';
import { optimizedPicture } from '../../scripts/block-helpers.js';

// online stores that get their logo in the Buy Now pop-up, matched by link host
const STORES = [
  { key: 'blinkit', name: 'Blinkit', host: /(^|\.)blinkit\.com$/ },
  { key: 'zepto', name: 'Zepto', host: /(^|\.)zepto(now)?\.com$/ },
  { key: 'bigbasket', name: 'BigBasket', host: /(^|\.)bigbasket\.com$/ },
  { key: 'swiggy', name: 'Swiggy Instamart', host: /(^|\.)swiggy\.com$/ },
  { key: 'amazon', name: 'Amazon', host: /(^|\.)amazon\.(in|com)$/ },
  { key: 'flipkart', name: 'Flipkart', host: /(^|\.)flipkart\.com$/ },
  { key: 'jiomart', name: 'JioMart', host: /(^|\.)jiomart\.com$/ },
];
const DEFAULT_NOTE = 'This product is now available at your nearby stores';

let dialog;

/** The Buy Now pop-up, shared by every Product Grid on the page. */
function buyDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'product-grid-dialog';
  dialog.setAttribute('aria-labelledby', 'product-grid-dialog-title');
  dialog.innerHTML = `
    <button type="button" class="product-grid-dialog-close" aria-label="Close"></button>
    <h2 id="product-grid-dialog-title">Buy Now<span class="product-grid-sr"></span></h2>
    <ul class="product-grid-stores"></ul>
    <p class="product-grid-note"></p>`;
  dialog.querySelector('.product-grid-dialog-close').addEventListener('click', () => dialog.close());
  // a click on the dimmed backdrop (the dialog element itself) closes it
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.body.append(dialog);
  return dialog;
}

function storeLink(link) {
  let host = '';
  try {
    host = new URL(link.href).hostname;
  } catch {
    return null;
  }
  const store = STORES.find((s) => s.host.test(host));
  const text = link.textContent.trim();
  const name = text && text !== link.href ? text : store?.name || host;
  const a = document.createElement('a');
  a.href = link.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = `product-grid-store${store ? ` product-grid-store-${store.key}` : ''}`;
  a.title = name;
  if (store) {
    const icon = document.createElement('img');
    icon.src = `${window.hlx.codeBasePath}/blocks/product-grid/stores/${store.key}.png`;
    icon.alt = '';
    icon.width = 40;
    icon.height = 40;
    const label = document.createElement('span');
    label.className = 'product-grid-sr';
    label.textContent = `${name} (opens in a new tab)`;
    a.append(icon, label);
  } else {
    a.textContent = name;
    a.setAttribute('aria-label', `${name} (opens in a new tab)`);
  }
  return a;
}

function openStores(name, links, note, opener) {
  const d = buyDialog();
  d.querySelector('h2 .product-grid-sr').textContent = name ? `: ${name}` : '';
  d.querySelector('.product-grid-stores').replaceChildren(...links.map((a) => {
    const li = document.createElement('li');
    li.append(a.cloneNode(true));
    return li;
  }));
  d.querySelector('.product-grid-note').textContent = note;
  d.addEventListener('close', () => opener.focus(), { once: true });
  d.showModal();
}

/** An image field: a picture, or a link to an image (possibly wrapped in a paragraph). */
const isImage = (el) => el.querySelector('picture, img')
  || /\.(png|jpe?g|gif|webp|avif|svg)([?#]|$)|\/is\/image\//i.test(el.querySelector('a[href]')?.href || '');

/** The store links: a list, several links, or a link to a known store. */
const isStores = (el) => el.querySelector('ul, ol') || el.querySelectorAll('a[href]').length > 1
  || [...el.querySelectorAll('a[href]')].some((a) => {
    try {
      return STORES.some((store) => store.host.test(new URL(a.href).hostname));
    } catch {
      return false;
    }
  });

/**
 * Product packs in a grid, each with a Buy Now button that opens a pop-up of
 * online stores selling it.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const rows = [...block.children];
  // AEM can leave out empty fields, so rows and cells are told apart by what they hold:
  // products have a pack image or store links; the block's own field (the note) has neither
  const isProduct = (row) => [...row.children].some((c) => isImage(c) || isStores(c));
  const note = rows.find((row) => !isProduct(row))?.textContent.trim() || DEFAULT_NOTE;

  const list = document.createElement('ul');
  list.className = 'product-grid-list';
  rows.filter(isProduct).forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells.find(isImage);
    const storesCell = cells.find((c) => c !== imageCell && isStores(c));
    const others = cells.filter((c) => c !== imageCell && c !== storesCell && c.textContent.trim());
    const linkCell = others.find((c) => c.querySelector('a[href]'));
    const nameCell = others.find((c) => c !== linkCell);
    const li = document.createElement('li');
    li.className = 'product-grid-item';
    moveInstrumentation(row, li);

    // without a name field, the pack's alt text (e.g. "Magic Masala Noodles pack") names it
    const alt = imageCell?.querySelector('img')?.alt || imageCell?.querySelector('a')?.textContent || '';
    const name = nameCell?.textContent.trim() || alt.trim().replace(/\s+pack$/i, '');
    const link = linkCell?.querySelector('a[href]');
    const media = document.createElement(link ? 'a' : 'div');
    media.className = 'product-grid-media';
    if (link) {
      media.href = link.href;
      moveInstrumentation(link, media);
    }
    const picture = optimizedPicture(imageCell, '508');
    if (picture) {
      const img = picture.querySelector('img');
      if (!img.alt) img.alt = name;
      media.append(picture);
    }
    li.append(media);

    const stores = [...(storesCell?.querySelectorAll('a[href]') || [])].map(storeLink).filter(Boolean);
    if (stores.length) {
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'button primary product-grid-buy';
      buy.setAttribute('aria-haspopup', 'dialog');
      buy.textContent = 'Buy Now';
      if (name) {
        const label = document.createElement('span');
        label.className = 'product-grid-sr';
        label.textContent = ` ${name}`;
        buy.append(label);
      }
      buy.addEventListener('click', () => openStores(name, stores, note, buy));
      li.append(buy);
    }
    list.append(li);
  });

  block.replaceChildren(list);
}
