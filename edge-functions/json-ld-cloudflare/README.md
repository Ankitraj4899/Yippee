# JSON-LD Cloudflare Worker

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that serves the YiPPee! site on its own domain from Edge Delivery and adds [schema.org](https://schema.org) structured data to every page, so search engines and other crawlers get it in the first HTML response.

```text
Browser → Cloudflare (this Worker, caches) → main--yippee--ankitraj4899.aem.live
```

It is the Cloudflare version of the AEM Edge Function in [`../json-ld`](../json-ld/README.md) (which only runs on Adobe's managed CDN). Use one or the other, not both: whichever CDN serves your domain.

- **Same structured data.** The JSON-LD is built by [`scripts/jsonld.js`](../../scripts/jsonld.js), the same code the site uses in the browser and the AEM Edge Function uses. See the table in [`../json-ld/README.md`](../json-ld/README.md) for what each page gets (Organization, WebSite, WebPage, BreadcrumbList, Recipe, recipe and product lists, BlogPosting, FAQPage).
- **No duplicates.** The site still adds JSON-LD in the browser when a page has none. Once this Worker is live, pages already carry it, so the browser step skips.
- **The CDN part** follows Adobe's [Cloudflare setup for Edge Delivery](https://www.aem.live/docs/byo-cdn-cloudflare-worker-setup): it forwards requests to aem.live with the headers Edge Delivery expects, keeps only the query parameters Edge Delivery uses, hides `/drafts/`, and lets AEM clear Cloudflare's cache when pages are published (push invalidation).
- **Safe.** Fragments (`.plain.html`), non-HTML files, error pages, non-GET requests and `noindex` pages pass through untouched. If the structured data can't be built, the page is served without it.

## Files

| File | Purpose |
|---|---|
| `src/index.js` | The Worker: proxy to Edge Delivery, add JSON-LD to HTML pages |
| `wrangler.toml` | Worker name, route (your domain) and settings |
| `test/worker-test.js` | Tests against saved copies of live pages (shared with `../json-ld/test/fixtures`) |

## Prerequisites

- **A Cloudflare account** with the site's domain added as a zone (its nameservers pointing to Cloudflare).
- **Node.js and npm.**
- **Your own domain.** The Worker runs on a route on your domain (for example `www.yourbrand.com/*`); it does not change `*.aem.live`.

## Set up and deploy

1. **Install and test:**
   ```bash
   cd edge-functions/json-ld-cloudflare
   npm install
   npm test
   ```
2. **Set your domain** in `wrangler.toml`: replace `www.example.com` and `example.com` in `routes` with your site's host and zone.
3. **Add a DNS record** for that host in Cloudflare, **proxied** (orange cloud). The Worker answers every request, so the record only needs to exist. Adobe suggests an `AAAA` record pointing to `100::`.
4. **Log in and deploy:**
   ```bash
   npx wrangler login
   npm run deploy
   ```
5. **Let AEM clear Cloudflare's cache on publish** (push invalidation), following [Adobe's guide](https://www.aem.live/docs/setup-byo-cdn-push-invalidation):
   - In Cloudflare, create an **API token** with the **Zone → Cache Purge** permission for your zone, and note the **Zone ID** (zone Overview page).
   - Add them to the site's **production CDN configuration** in AEM (CDN type `cloudflare`, your host, the zone ID and the token).
   - Keep the token out of this repository and out of chats.
6. **Recommended Cloudflare settings** for Edge Delivery (see Adobe's guide): SSL/TLS **Full (strict)**, and leave features that rewrite pages, such as Rocket Loader and Email Obfuscation, **off**.
7. **Only if the site's content is protected** (site authentication): store the site token as a secret, never in `wrangler.toml`:
   ```bash
   npx wrangler secret put ORIGIN_AUTHENTICATION
   ```

## Test

- **Before deploying:** `npm test`, and `npm run check` to confirm the Worker bundles (writes to `dist/`, which is git-ignored).
- **Locally against the live site:** `npm run dev`, then in another terminal:
  ```bash
  curl -s http://localhost:8787/recipes/noodle-burger | grep -o '<script type="application/ld+json">.*</script>'
  ```
  The URLs in the data then start with `http://localhost:8787`; on your domain they use your domain.
- **After deploying:** the structured data is now in the page source:
  ```bash
  curl -s https://www.yourbrand.com/recipes/noodle-burger | grep -c 'application/ld+json'   # 1
  ```
  Then check a page with Google's [Rich Results Test](https://search.google.com/test/rich-results) or the [Schema Markup Validator](https://validator.schema.org/) (paste the URL; no JavaScript needed now).
- **Logs:** `npm run logs` (or Workers Logs in the Cloudflare dashboard).

## Settings (`wrangler.toml` `[vars]`)

| Name | Default | Purpose |
|---|---|---|
| `ORIGIN_HOSTNAME` | `main--yippee--ankitraj4899.aem.live` | Edge Delivery origin; must be a `main--{repo}--{owner}.aem.live` host |
| `PUSH_INVALIDATION` | `enabled` | Set to `disabled` if AEM does not purge Cloudflare (then pages refresh only when their cache time runs out) |
| `ORIGIN_AUTHENTICATION` | (secret, unset) | Site token, only for protected content |
