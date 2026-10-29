import { buildJsonLd, logoFromNav } from './jsonld.js';

/**
 * Adds schema.org JSON-LD to the page, built from its original (undecorated)
 * content with the same builder as the JSON-LD edge function. Pages that already
 * carry JSON-LD, from the edge function or json-ld page metadata, are left alone.
 * @param {object} page
 * @param {string} page.rawMain the main element's HTML before decoration
 * @param {string[]} page.segments the page path segments
 * @param {string} page.base path prefix of the local preview ('' on the site)
 */
export default async function addStructuredData({ rawMain, segments, base }) {
  if (document.querySelector('script[type="application/ld+json"]')) return;

  const path = `/${segments.join('/')}`;
  const isRecipeList = path === '/recipes';
  const fetchText = (url) => fetch(url).then((res) => (res.ok ? res.text() : '')).catch(() => '');
  const navPath = new URL(document.querySelector('meta[name="nav"]')?.content || `${base}/nav`, window.location).pathname;
  const indexUrl = document.querySelector('.recipes[data-source]')?.dataset.source || `${base}/query-index.json`;

  const [navHtml, indexJson] = await Promise.all([
    fetchText(`${navPath.replace(/(\.plain)?\.html$/, '')}.plain.html`),
    isRecipeList ? fetchText(indexUrl) : Promise.resolve(''),
  ]);
  let recipes = [];
  try {
    recipes = indexJson ? JSON.parse(indexJson).data.filter((r) => r.path?.startsWith('/recipes/') && r.title) : [];
  } catch {
    // no recipe list without an index
  }

  const html = `<html><head>${document.head.innerHTML}</head><body><main>${rawMain}</main></body></html>`;
  const jsonLd = buildJsonLd(html, {
    url: `${window.location.origin}${path}`,
    logo: logoFromNav(navHtml, window.location.origin),
    recipes,
  });
  if (!jsonLd) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  document.head.append(script);
}
