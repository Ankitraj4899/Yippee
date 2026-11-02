/* eslint-env mocha */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { handleRequest } from '../src/index.js';

// saved copies of live pages, shared with the AEM Edge Function's tests (read only)
const fixture = (name) => readFileSync(new URL(`../../json-ld/test/fixtures/${name}`, import.meta.url), 'utf8');
const SITE = 'https://www.example.com';
const ORIGIN = 'main--yippee--ankitraj4899.aem.live';
const env = { ORIGIN_HOSTNAME: ORIGIN, PUSH_INVALIDATION: 'enabled' };

const html = (body, headers = {}) => new Response(body, {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
});

/** Stands in for Edge Delivery: answers by path and records every origin request. */
function mockOrigin(pages) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
    calls.push({
      url, headers, method: init.method || 'GET', cf: init.cf,
    });
    const page = pages[`${url.pathname}${url.search}`] ?? pages[url.pathname];
    if (typeof page === 'function') return page();
    return page ? page.clone() : new Response('Not Found', { status: 404 });
  };
  return calls;
}

const jsonLdOf = async (response) => {
  const match = (await response.text()).match(/<script type="application\/ld\+json">(.*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
};
const types = (doc) => doc['@graph'].map((node) => node['@type']);

describe('Cloudflare Worker', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  it('adds JSON-LD to a recipe page, with URLs on the site domain', async () => {
    const calls = mockOrigin({
      '/recipes/pasta-tikki': html(fixture('pasta-tikki.html')),
      '/nav.plain.html': html(fixture('nav.html')),
    });
    const res = await handleRequest(new Request(`${SITE}/recipes/pasta-tikki`), env);
    assert.equal(res.status, 200);
    const doc = await jsonLdOf(res);
    assert.deepEqual(types(doc), ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList', 'Recipe']);
    const recipe = doc['@graph'].find((n) => n['@type'] === 'Recipe');
    assert.equal(recipe['@id'], `${SITE}/recipes/pasta-tikki#recipe`);
    assert.equal(recipe.recipeIngredient.length, 10);
    assert.match(doc['@graph'][0].logo.url, /^https:\/\/www\.example\.com\/media_/);
    assert.equal(res.headers.get('content-length'), null);

    // the page and the nav come from Edge Delivery through Cloudflare's cache
    assert.deepEqual(calls.map((c) => c.url.href), [
      `https://${ORIGIN}/recipes/pasta-tikki`,
      `https://${ORIGIN}/nav.plain.html`,
    ]);
    calls.forEach((call) => assert.deepEqual(call.cf, { cacheEverything: true }));
  });

  it('sends the headers Edge Delivery expects from a Cloudflare CDN', async () => {
    const calls = mockOrigin({ '/': html(fixture('home.html')), '/nav.plain.html': html(fixture('nav.html')) });
    await handleRequest(new Request(`${SITE}/`, { headers: { host: 'www.example.com' } }), env);
    const { headers } = calls[0];
    assert.equal(headers.get('x-forwarded-host'), 'www.example.com');
    assert.equal(headers.get('x-byo-cdn-type'), 'cloudflare');
    assert.equal(headers.get('x-push-invalidation'), 'enabled');
    assert.equal(headers.get('authorization'), null);
  });

  it('adds the site token only when one is configured', async () => {
    const calls = mockOrigin({ '/': html(fixture('home.html')), '/nav.plain.html': html(fixture('nav.html')) });
    await handleRequest(new Request(`${SITE}/`), { ...env, ORIGIN_AUTHENTICATION: 'abc', PUSH_INVALIDATION: 'disabled' });
    assert.equal(calls[0].headers.get('authorization'), 'token abc');
    assert.equal(calls[0].headers.get('x-push-invalidation'), null);
  });

  it('lists every recipe on the recipes page from the query index', async () => {
    const calls = mockOrigin({
      '/recipes': html(fixture('recipes.html')),
      '/nav.plain.html': html(fixture('nav.html')),
      '/query-index.json?limit=500': new Response(fixture('query-index.json'), { headers: { 'content-type': 'application/json' } }),
    });
    const doc = await jsonLdOf(await handleRequest(new Request(`${SITE}/recipes?category=snacks`), env));
    const list = doc['@graph'].find((n) => n['@type'] === 'ItemList');
    assert.ok(list.numberOfItems > 0);
    assert.ok(list.itemListElement.every((item) => item.url.startsWith(`${SITE}/recipes/`)));
    // page query strings are not sent to the origin (Edge Delivery ignores them)
    assert.equal(calls[0].url.href, `https://${ORIGIN}/recipes`);
  });

  it('adds BlogPosting and FAQPage to a blog article', async () => {
    mockOrigin({
      '/blog-listing/korean-noodles': html(fixture('blog-article.html')),
      '/nav.plain.html': html(fixture('nav.html')),
    });
    const doc = await jsonLdOf(await handleRequest(new Request(`${SITE}/blog-listing/korean-noodles`), env));
    assert.ok(types(doc).includes('BlogPosting'));
    assert.ok(types(doc).includes('FAQPage'));
  });

  it('leaves pages that already carry JSON-LD as they are', async () => {
    const page = fixture('home.html').replace('</head>', '<script type="application/ld+json">{"@type":"Thing"}</script></head>');
    mockOrigin({ '/': html(page), '/nav.plain.html': html(fixture('nav.html')) });
    const body = await (await handleRequest(new Request(`${SITE}/`), env)).text();
    assert.equal(body.match(/application\/ld\+json/g).length, 1);
  });

  it('passes fragments, other files, errors and non-GET requests through untouched', async () => {
    const plain = '<div><p>nav</p></div>';
    const calls = mockOrigin({
      '/nav.plain.html': html(plain),
      '/scripts/scripts.js': new Response('export {}', { headers: { 'content-type': 'application/javascript' } }),
      '/missing': () => new Response('<html><head></head></html>', { status: 404, headers: { 'content-type': 'text/html' } }),
      '/form': html('<html><head></head><body></body></html>'),
    });
    assert.equal(await (await handleRequest(new Request(`${SITE}/nav.plain.html`), env)).text(), plain);
    assert.equal(await (await handleRequest(new Request(`${SITE}/scripts/scripts.js`), env)).text(), 'export {}');
    const missing = await handleRequest(new Request(`${SITE}/missing`), env);
    assert.equal(missing.status, 404);
    assert.doesNotMatch(await missing.text(), /ld\+json/);
    await handleRequest(new Request(`${SITE}/form`, { method: 'POST', body: 'a=1' }), env);
    // one origin request each: no nav fetched for anything but a full HTML page on GET
    assert.equal(calls.length, 4);
  });

  it('keeps only the query parameters Edge Delivery uses for media and JSON', async () => {
    const calls = mockOrigin({});
    const media = 'media_1c7a7090cf0c67e8ec070bbabcdad18ef23e62050.png';
    await handleRequest(new Request(`${SITE}/${media}?width=750&format=webply&utm_source=x&optimize=medium`), env);
    await handleRequest(new Request(`${SITE}/query-index.json?limit=10&foo=bar`), env);
    assert.equal(calls[0].url.search, '?format=webply&optimize=medium&width=750');
    assert.equal(calls[1].url.search, '?limit=10');
  });

  it('keeps the visitor query string on redirects and redirects non-standard ports', async () => {
    mockOrigin({ '/old': () => new Response(null, { status: 301, headers: { location: '/new' } }) });
    const moved = await handleRequest(new Request(`${SITE}/old?utm_source=mail`), env);
    assert.equal(moved.headers.get('location'), '/new?utm_source=mail');
    const port = await handleRequest(new Request('https://www.example.com:8443/recipes'), env);
    assert.equal(port.status, 301);
    assert.equal(port.headers.get('location'), 'https://www.example.com/recipes');
  });

  it('hides drafts and rejects an origin that is not Edge Delivery', async () => {
    mockOrigin({});
    assert.equal((await handleRequest(new Request(`${SITE}/drafts/test`), env)).status, 404);
    assert.equal((await handleRequest(new Request(`${SITE}/`), { ORIGIN_HOSTNAME: 'evil.example.net' })).status, 500);
  });

  it('still adds JSON-LD (without the logo) when the nav cannot be read, and answers 500 if the origin is down', async () => {
    mockOrigin({ '/': html(fixture('home.html')), '/nav.plain.html': () => { throw new Error('network'); } });
    const res = await handleRequest(new Request(`${SITE}/`), env);
    assert.equal(res.status, 200);
    const doc = await jsonLdOf(res);
    assert.equal(doc['@graph'][0].logo, undefined);

    globalThis.fetch = async () => { throw new Error('origin down'); };
    const failed = await worker.fetch(new Request(`${SITE}/`), env);
    assert.equal(failed.status, 500);
  });
});
