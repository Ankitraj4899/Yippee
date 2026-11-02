/*
 * Cloudflare Worker: the site's CDN in front of Edge Delivery (aem.live), which also adds
 * schema.org JSON-LD to every HTML page, so search engines get it in the first response.
 *
 * Browser → Cloudflare (this Worker) → main--yippee--ankitraj4899.aem.live
 *
 * The proxy part follows Adobe's Cloudflare setup for Edge Delivery
 * (https://www.aem.live/docs/byo-cdn-cloudflare-worker-setup); the JSON-LD is built by
 * the same code the site uses in the browser (scripts/jsonld.js).
 */
import { buildJsonLd, injectJsonLd, logoFromNav } from '../../../scripts/jsonld.js';

const DEFAULT_ORIGIN_HOSTNAME = 'main--yippee--ankitraj4899.aem.live';

const getExtension = (path) => {
  const basename = path.split('/').pop();
  const pos = basename.lastIndexOf('.');
  return basename === '' || pos < 1 ? '' : basename.slice(pos + 1);
};

const isMediaRequest = (url) => /\/media_[0-9a-f]{40,}[/a-zA-Z0-9_-]*\.[0-9a-z]+$/.test(url.pathname);
const isRUMRequest = (url) => /\/\.(rum|optel)\/.*/.test(url.pathname);

/** The origin URL for a request: Edge Delivery only needs the query string for media and JSON. */
function originUrl(request, env) {
  const url = new URL(request.url);
  if (!isRUMRequest(url)) {
    const { searchParams } = url;
    const keep = (allowed) => [...searchParams.keys()]
      .filter((key) => !allowed.includes(key))
      .forEach((key) => searchParams.delete(key));
    const extension = getExtension(url.pathname);
    if (isMediaRequest(url)) keep(['format', 'height', 'optimize', 'width']);
    else if (extension === 'json') keep(['limit', 'offset', 'sheet']);
    else url.search = '';
    searchParams.sort();
  }
  url.hostname = env.ORIGIN_HOSTNAME || DEFAULT_ORIGIN_HOSTNAME;
  url.port = '';
  url.protocol = 'https:';
  return url;
}

/** Headers Edge Delivery expects from a Cloudflare CDN in front of it. */
function originHeaders(request, env, publicHost) {
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', publicHost);
  headers.set('x-byo-cdn-type', 'cloudflare');
  if (env.PUSH_INVALIDATION !== 'disabled') headers.set('x-push-invalidation', 'enabled');
  if (env.ORIGIN_AUTHENTICATION) headers.set('authorization', `token ${env.ORIGIN_AUTHENTICATION}`);
  return headers;
}

/** Fetches from Edge Delivery through Cloudflare's cache (purged by AEM on publish). */
const fetchOrigin = (url, init) => fetch(url, { ...init, cf: { cacheEverything: true } });

async function fetchText(url, headers) {
  try {
    const res = await fetchOrigin(url, { method: 'GET', headers });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function fetchRecipes(url, headers) {
  try {
    const rows = JSON.parse(await fetchText(url, headers) || '{}').data || [];
    return rows.filter((row) => row.path?.startsWith('/recipes/') && row.title);
  } catch {
    return [];
  }
}

/**
 * Adds the JSON-LD to an HTML page; anything else, or any failure, returns the page as it was.
 * @returns {Promise<Response>}
 */
async function withJsonLd(response, { url, origin, headers }) {
  const type = response.headers.get('content-type') || '';
  if (response.status !== 200 || !type.includes('text/html') || url.pathname.endsWith('.plain.html')) {
    return response;
  }
  const html = await response.text();
  try {
    const isRecipeList = /^\/recipes\/?$/.test(url.pathname);
    const [nav, recipes] = await Promise.all([
      fetchText(new URL('/nav.plain.html', origin), headers),
      isRecipeList ? fetchRecipes(new URL('/query-index.json?limit=500', origin), headers) : [],
    ]);
    const jsonLd = buildJsonLd(html, {
      url: `${url.origin}${url.pathname}`,
      logo: logoFromNav(nav, url.origin),
      recipes,
    });
    const body = injectJsonLd(html, jsonLd);
    const out = new Response(body, response);
    out.headers.delete('content-length');
    return out;
  } catch (err) {
    // never break the page because of structured data
    console.error('json-ld: could not build structured data', url.pathname, err);
    return new Response(html, response);
  }
}

/**
 * Handles one request.
 * @param {Request} request The visitor's request (on the site's own domain)
 * @param {object} env Worker variables (wrangler.toml [vars] and secrets)
 */
export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  // Cloudflare answers on several ports; send visitors back to the standard one
  if (url.port) {
    const redirectTo = new URL(request.url);
    redirectTo.port = '';
    return new Response(`Moved permanently to ${redirectTo.href}`, {
      status: 301,
      headers: { location: redirectTo.href },
    });
  }
  if (url.pathname.startsWith('/drafts/')) return new Response('Not Found', { status: 404 });

  const savedSearch = url.search;
  const target = originUrl(request, env);
  if (!/^https:\/\/main--.*--.*\.(?:aem|hlx)\.live$/.test(target.origin)) {
    return new Response('Invalid ORIGIN_HOSTNAME', { status: 500 });
  }
  const headers = originHeaders(request, env, request.headers.get('host') || url.host);

  const originResponse = await fetchOrigin(new Request(target, request), {
    method: request.method,
    headers,
  });
  let response = new Response(originResponse.body, originResponse);

  // keep the visitor's query string on redirects (e.g. campaign parameters)
  if (response.status === 301 && savedSearch) {
    const location = response.headers.get('location');
    if (location && !/\?.*$/.test(location)) response.headers.set('location', `${location}${savedSearch}`);
  }
  if (response.status === 304) response.headers.delete('Content-Security-Policy');
  response.headers.delete('age');
  response.headers.delete('x-robots-tag');

  if (request.method === 'GET') {
    response = await withJsonLd(response, { url, origin: target.origin, headers });
  }
  return response;
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error('json-ld: request failed', err);
      return new Response('Internal Error', { status: 500 });
    }
  },
};
