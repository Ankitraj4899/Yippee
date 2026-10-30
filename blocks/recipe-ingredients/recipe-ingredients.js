import { getMetadata } from '../../scripts/aem.js';

const PACKS = 'https://s7ap1.scene7.com/is/image/itcportalprod/';
// pack shots of the products a recipe can use (its Products page property)
const PACK_IMAGES = {
  'magic masala noodles': '346x265-04',
  'mood masala noodles': '346x265-05',
  'power up atta noodles': '346x265-03',
  'wow masala noodles': '346x265-06',
  'magic millet noodles': '346x265-07',
  'pasta treat masala': '346x265-09',
  'pasta treat tomato cheese': '346x265-11',
  'pasta treat cheese': '346x265-08',
  'pasta treat sour cream onion': '346x265-10',
  'tricolor pasta creamy corn': '346x265-12',
  'tricolor pasta masala': '346x265-13',
};

/**
 * A recipe's ingredients (built from the list under its Ingredients heading): one per
 * row, beside the pack shot of the YiPPee! product it uses.
 * @param {Element} block The block
 */
export default function decorate(block) {
  const list = block.querySelector('ul, ol');
  if (!list) return;
  list.classList.add('recipe-ingredients-list');

  const content = [list];
  const product = getMetadata('products').split(',').map((p) => p.trim())
    .find((p) => PACK_IMAGES[p.toLowerCase()]);
  if (product) {
    const figure = document.createElement('figure');
    figure.className = 'recipe-ingredients-pack';
    const img = document.createElement('img');
    img.src = `${PACKS}${PACK_IMAGES[product.toLowerCase()]}?fmt=png-alpha&wid=826&fit=fit,1`;
    img.alt = `YiPPee! ${product} pack`;
    img.loading = 'lazy';
    img.width = 413;
    img.height = 310;
    figure.append(img);
    content.push(figure);
  }
  block.replaceChildren(...content);
}
