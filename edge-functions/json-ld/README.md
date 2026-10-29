# JSON-LD edge function

An [AEM Edge Function](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/edge-functions) that adds [schema.org](https://schema.org) structured data to every YiPPee! page at the CDN, so search engines get it in the first HTML response.

```text
Browser → Adobe CDN (caches) → json-ld function (no cache) → main--yippee--ankitraj4899.aem.live (caches)
```

The function fetches the page from Edge Delivery, reads its content, and adds one `<script type="application/ld+json">` with a `@graph` before `</head>`.

| Page | Structured data |
|---|---|
| Every page | `Organization` (name, logo from the nav, social profiles, parent ITC Limited), `WebSite`, `WebPage` |
| Every page below the homepage | `BreadcrumbList` (Home › Recipes › …) |
| `/recipes/*` | `Recipe`: name (h1), description, photo, category, published date, prep/cook/total time (ISO 8601), servings, ingredients, method steps |
| `/recipes` | `CollectionPage` with an `ItemList` of every recipe from `/query-index.json` |

Authors don't do anything extra. The data comes from what is already on the page: the Recipe Info block, the **Ingredients** list, the **Method** list, and the Recipe Category and Cooking Time page properties. If a page already has JSON-LD (for example from `json-ld` page metadata), it is left unchanged. Pages marked `noindex`, `.plain.html` fragments, non-HTML files and error pages pass through untouched.

Cache purges keep working. The response carries the surrogate keys of the page, the nav (logo) and, for `/recipes`, the query index, so publishing in AEM refreshes the CDN copy.

## Files

| File | Purpose |
|---|---|
| `src/index.js` | Request handler: proxy to Edge Delivery, add JSON-LD, merge cache headers |
| `../../scripts/jsonld.js` | Builds and injects the JSON-LD (plain functions, shared with the site, which adds the same data itself while this function is not deployed) |
| `config/edgeFunctions.yaml` | Declares the `json-ld` edge function |
| `config/cdn.yaml` | Routes page requests on the site domain to the function |
| `test/` | Mocha tests against saved copies of live pages (`npm run fixtures` refreshes them) |

## Prerequisites

AEM Edge Functions are in **public beta**. To use them you need:

- **Enrolment** in the beta for your Cloud Manager program; ask Adobe via the Experience League page above.
- **The site onboarded to Cloud Manager**, with an **Edge Delivery Services pipeline**.
- **A custom domain on the Adobe-managed CDN.** Edge Functions only run on the site's own domain, not on `*.aem.live`.
- **The AEM Administrator product profile**, or the **Cloud Manager Deployment Manager** role.
- **Node.js and npm.** Then install the Adobe CLI and its plugin:
  ```bash
  npm install -g @adobe/aio-cli
  aio plugins install @adobe/aio-cli-plugin-aem-edge-functions
  aio login
  aio aem edge-functions setup   # pick the environment
  ```

## Deploy

1. **Set your domain** in `config/cdn.yaml`: replace `www.example.com` with the site's custom domain.
   - If you already have a `cdn.yaml`, add the `route-pages-to-json-ld` rule to it instead.
2. **Register the function:** commit `config/edgeFunctions.yaml` and `config/cdn.yaml` to the repository your Edge Delivery Services pipeline deploys from, and run the pipeline.
   - Point the pipeline's config location at this folder, or copy the two files into your existing `config/` folder.
3. **Build and deploy the code:**
   ```bash
   cd edge-functions/json-ld
   npm install
   npm test
   aio aem edge-functions build
   aio aem edge-functions deploy json-ld
   ```
4. **Test on the debug host** printed by the deploy command:
   ```bash
   curl -s https://edgefunction-pXXXXX-dYYYYY-json-ld.adobeaemcloud.com/recipes/pasta-tikki | grep -o '<script type="application/ld+json">.*</script>'
   ```
   Then check a page on your domain with [Google's Rich Results Test](https://search.google.com/test/rich-results) or the [Schema Markup Validator](https://validator.schema.org/).
5. **Watch the logs** if something looks off:
   ```bash
   aio aem edge-functions tail-logs json-ld
   ```

The origin defaults to `https://main--yippee--ankitraj4899.aem.live`. To change it without a code change, set the `AEM_ORIGIN` config value in `edgeFunctions.yaml`. Config values aren't available on sandbox programs.
