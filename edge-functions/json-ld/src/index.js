/// <reference types="@fastly/js-compute" />
/*
 * AEM Edge Function: proxies HTML pages from Edge Delivery and adds schema.org
 * JSON-LD to their <head>. Everything else passes through unchanged.
 *
 * Browser → Adobe CDN (caches) → this function (no cache) → aem.live origin (caches)
 */
import { ConfigStore } from 'fastly:config-store';
import { CacheOverride } from 'fastly:cache-override';
import { buildJsonLd, injectJsonLd, logoFromNav } from './jsonld.js';

// Edge Delivery origin; can be overridden with the AEM_ORIGIN config value
const DEFAULT_ORIGIN = 'https://main--yippee--ankitraj4899.aem.live';
const FORWARDED_HEADERS = ['X-Forwarded-Host', 'User-Agent', 'X-AEM-Request-ID', 'Accept-Language'];

function aemOrigin() {
  try {
    return new ConfigStore('config_default').get('AEM_ORIGIN') || DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN; // config stores aren't provisioned on sandbox programs
  }
}

function originHeaders(req) {
  const headers = new Headers();
  FORWARDED_HEADERS.forEach((name) => {
    const value = req.headers.get(name);
    if (value !== null) headers.set(name, value);
  });
  headers.set('X-BYO-CDN-Type', 'fastly');
  headers.set('X-Push-Invalidation', 'enabled');
  // the HTML is rewritten, so ask for it uncompressed
  headers.set('Accept-Encoding', 'identity');
  return headers;
}

/** Fetches from the origin without caching in the function; the CDN and origin cache instead. */
function fetchOrigin(url, headers, method = 'GET') {
  return fetch(url, { method, headers, cacheOverride: new CacheOverride('pass') });
}

async function fetchText(url, headers) {
  try {
    const res = await fetchOrigin(url, headers);
    return { res, text: res.ok ? await res.text() : null };
  } catch {
    return { res: null, text: null };
  }
}

async function fetchRecipes(origin, headers) {
  const { res, text } = await fetchText(`${origin}/query-index.json?limit=500`, headers);
  try {
    const rows = text ? JSON.parse(text).data || [] : [];
    return { res, recipes: rows.filter((r) => r.path?.startsWith('/recipes/') && r.title) };
  } catch {
    return { res, recipes: [] };
  }
}

/** Surrogate keys of every response the page was built from, so purges still reach it. */
function mergeSurrogateKeys(responses) {
  const keys = new Set(responses.flatMap((res) => (res?.headers.get('surrogate-key') || '').split(/\s+/).filter(Boolean)));
  return [...keys].join(' ');
}

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);
  const origin = aemOrigin();
  const headers = originHeaders(req);
  const originUrl = `${origin}${url.pathname}${url.search}`;

  if (req.method !== 'GET') return fetchOrigin(originUrl, headers, req.method);

  const page = await fetchOrigin(originUrl, headers);
  const type = page.headers.get('content-type') || '';
  if (!page.ok || !type.includes('text/html')) return page;

  // the public URL the visitor asked for (custom domain), used for every @id and url
  const publicHost = req.headers.get('X-Forwarded-Host') || url.host;
  const publicOrigin = `https://${publicHost.split(',')[0].trim()}`;
  const isRecipeList = /^\/recipes\/?$/.test(url.pathname);

  const [html, nav, index] = await Promise.all([
    page.text(),
    fetchText(`${origin}/nav.plain.html`, headers),
    isRecipeList ? fetchRecipes(origin, headers) : Promise.resolve({ res: null, recipes: [] }),
  ]);

  let body = html;
  try {
    const jsonLd = buildJsonLd(html, {
      url: `${publicOrigin}${url.pathname}`,
      logo: logoFromNav(nav.text, publicOrigin),
      recipes: index.recipes,
    });
    body = injectJsonLd(html, jsonLd);
  } catch (err) {
    // never break the page because of structured data
    console.error('json-ld: could not build structured data', url.pathname, err);
  }

  const responseHeaders = new Headers(page.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('content-encoding');
  const surrogateKeys = mergeSurrogateKeys([page, nav.res, index.res]);
  if (surrogateKeys) responseHeaders.set('Surrogate-Key', surrogateKeys);

  return new Response(body, { status: page.status, headers: responseHeaders });
}

addEventListener('fetch', (event) => event.respondWith(handleRequest(event).catch((err) => {
  console.error('json-ld: request failed', err);
  return new Response('Internal Edge Error', { status: 500 });
})));
