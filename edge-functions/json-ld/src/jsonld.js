/*
 * Builds schema.org JSON-LD for a YiPPee! page from the HTML Edge Delivery serves.
 * Pure functions only (no Fastly APIs), so they run and are tested in Node too.
 */

const SITE_NAME = 'Sunfeast YiPPee!';
const PARENT_ORGANIZATION = { '@type': 'Organization', name: 'ITC Limited', url: 'https://www.itcportal.com/' };
const SOCIAL_PROFILES = [
  'https://www.instagram.com/sunfeast_yippee/',
  'https://www.facebook.com/SunfeastYippee/',
  'https://www.youtube.com/@SunfeastYiPPee',
  'https://x.com/sunfeastyippee',
];
// recipe-info block rows, in the order of its model
const RECIPE_INFO_FIELDS = ['prepTime', 'cookTime', 'serves', 'difficulty'];

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

/** Decodes the HTML entities Edge Delivery emits (named, decimal and hex). */
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(value) ? match : String.fromCodePoint(value);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Text content of an HTML fragment, whitespace collapsed. */
export function textOf(fragment) {
  return decodeEntities(fragment.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** content of <meta name|property="key">, attribute order independent. */
export function meta(html, key) {
  const tags = html.match(/<meta\s[^>]*>/gi) || [];
  const tag = tags.find((t) => new RegExp(`\\s(?:name|property)="${key}"`, 'i').test(t));
  const content = tag?.match(/\scontent="([^"]*)"/i);
  return content ? decodeEntities(content[1]).trim() : '';
}

function canonical(html) {
  const link = html.match(/<link\s[^>]*rel="canonical"[^>]*>/i)?.[0];
  const href = link?.match(/\shref="([^"]*)"/i);
  return href ? decodeEntities(href[1]) : '';
}

/** Items of the first <ul>/<ol> after the <h2> whose text matches `heading`. */
function listAfterHeading(main, heading) {
  const h2 = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].find((m) => heading.test(textOf(m[1])));
  if (!h2) return [];
  const rest = main.slice(h2.index + h2[0].length);
  const nextHeading = rest.search(/<h2[\s>]/i);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  const list = section.match(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!list) return [];
  return [...list[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => textOf(m[1])).filter(Boolean);
}

/** Prep time, cook time, serves and difficulty from the recipe-info block. */
function recipeInfo(main) {
  const start = main.search(/<div class="recipe-info(?:\s[^"]*)?">/i);
  if (start === -1) return {};
  const rows = [...main.slice(start).matchAll(/<div>\s*<div>([^<]*)<\/div>\s*<\/div>/gi)].slice(0, 4);
  return Object.fromEntries(rows
    .map((m, i) => [RECIPE_INFO_FIELDS[i], textOf(m[1])])
    .filter(([, value]) => value));
}

/** "1 hr 10 mins" → 70; a bare number counts as minutes; undefined when no time is found. */
export function minutesOf(text) {
  if (!text) return undefined;
  const hours = text.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i);
  const minutes = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (hours || minutes) return (hours ? hours[1] * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  const bare = text.match(/^\s*(\d+)\s*$/);
  return bare ? Number(bare[1]) : undefined;
}

/** Minutes → ISO 8601 duration, e.g. 70 → "PT1H10M". */
export function isoDuration(minutes) {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  return `PT${hours ? `${hours}H` : ''}${minutes % 60 ? `${minutes % 60}M` : ''}`;
}

function titleCase(segment) {
  return segment.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function breadcrumb(origin, path, pageName, pageId) {
  const segments = path.split('/').filter(Boolean);
  const items = [{ name: 'Home', item: `${origin}/` }];
  segments.forEach((segment, i) => {
    const isLast = i === segments.length - 1;
    items.push({
      name: isLast ? pageName : titleCase(segment),
      item: `${origin}/${segments.slice(0, i + 1).join('/')}`,
    });
  });
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageId}#breadcrumb`,
    itemListElement: items.map((entry, i) => ({ '@type': 'ListItem', position: i + 1, ...entry })),
  };
}

/** Drops empty values so the output only states what the page actually has. */
function compact(object) {
  return Object.fromEntries(Object.entries(object)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)));
}

/**
 * Builds the JSON-LD graph for a page.
 * @param {string} html the page HTML from Edge Delivery
 * @param {object} options
 * @param {string} options.url the public URL of the page
 * @param {string} [options.logo] absolute URL of the brand logo
 * @param {Array<{path: string, title: string, image?: string}>} [options.recipes] recipe index
 *   rows, listed on the recipes landing page
 * @returns {object|null} the JSON-LD document, or null for pages that get none
 */
export function buildJsonLd(html, { url, logo, recipes = [] }) {
  if (!/<head[\s>]/i.test(html)) return null; // fragments such as .plain.html
  if (/<meta\s[^>]*name="robots"[^>]*noindex/i.test(html)) return null;

  const pageUrl = new URL(canonical(html) || url);
  const { origin } = new URL(url);
  const path = pageUrl.pathname.replace(/\/index$/, '/');
  const pageId = `${origin}${path}`;
  const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)?.[1] || '';
  const h1 = main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const heading = h1 ? textOf(h1[1]) : '';
  const title = meta(html, 'og:title') || textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
  const description = meta(html, 'description') || meta(html, 'og:description');
  const image = meta(html, 'og:image');
  const isHome = path === '/';
  const isRecipe = /^\/recipes\/[^/]+$/.test(path);
  const isRecipeList = path === '/recipes';

  const organization = compact({
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: SITE_NAME,
    url: `${origin}/`,
    logo: logo ? { '@type': 'ImageObject', url: logo } : undefined,
    sameAs: SOCIAL_PROFILES,
    parentOrganization: PARENT_ORGANIZATION,
  });
  const website = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: SITE_NAME,
    url: `${origin}/`,
    publisher: { '@id': organization['@id'] },
  };
  const webpage = compact({
    '@type': isRecipeList ? 'CollectionPage' : 'WebPage',
    '@id': `${pageId}#webpage`,
    url: pageId,
    name: title || heading,
    description,
    isPartOf: { '@id': website['@id'] },
    primaryImageOfPage: image ? { '@type': 'ImageObject', url: image } : undefined,
    datePublished: meta(html, 'published-time') || undefined,
    breadcrumb: isHome ? undefined : { '@id': `${pageId}#breadcrumb` },
  });
  const graph = [organization, website, webpage];
  if (!isHome) graph.push(breadcrumb(origin, path, heading || title, pageId));

  if (isRecipe && heading) {
    const info = recipeInfo(main);
    const prep = minutesOf(info.prepTime);
    const cook = minutesOf(info.cookTime);
    const total = minutesOf(meta(html, 'duration')) || (prep && cook ? prep + cook : undefined);
    const ingredients = listAfterHeading(main, /ingredients/i);
    const steps = listAfterHeading(main, /method|instructions|directions|steps/i);
    const category = meta(html, 'category');
    graph.push(compact({
      '@type': 'Recipe',
      '@id': `${pageId}#recipe`,
      mainEntityOfPage: { '@id': webpage['@id'] },
      name: heading,
      description,
      image: image ? [image] : undefined,
      author: { '@id': organization['@id'] },
      datePublished: meta(html, 'published-time') || undefined,
      recipeCategory: category,
      keywords: [category, SITE_NAME].filter(Boolean).join(', '),
      prepTime: isoDuration(prep),
      cookTime: isoDuration(cook),
      totalTime: isoDuration(total),
      recipeYield: info.serves ? `${info.serves} servings` : undefined,
      recipeIngredient: ingredients,
      recipeInstructions: steps.map((text, i) => ({
        '@type': 'HowToStep', position: i + 1, text,
      })),
    }));
  }

  if (isRecipeList && recipes.length) {
    webpage.mainEntity = { '@id': `${pageId}#recipes` };
    graph.push({
      '@type': 'ItemList',
      '@id': `${pageId}#recipes`,
      name: heading || 'Recipes',
      numberOfItems: recipes.length,
      itemListElement: recipes.map((recipe, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: new URL(recipe.path, origin).href,
        name: recipe.title,
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * Adds the JSON-LD script to the page head. Pages that already carry JSON-LD
 * (for example from the json-ld page metadata) are left as they are.
 * @returns {string} the updated HTML
 */
export function injectJsonLd(html, jsonLd) {
  if (!jsonLd || /<script[^>]+type="application\/ld\+json"/i.test(html)) return html;
  const close = html.search(/<\/head>/i);
  if (close === -1) return html;
  // "<" is escaped so content such as "</script>" can't end the script early
  const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  return `${html.slice(0, close)}<script type="application/ld+json">${json}</script>\n${html.slice(close)}`;
}

/** First image in the nav fragment, as an absolute URL. */
export function logoFromNav(navHtml, origin) {
  const src = navHtml?.match(/<img\s[^>]*src="([^"]+)"/i)?.[1];
  if (!src) return undefined;
  const logo = new URL(decodeEntities(src), `${origin}/nav`);
  logo.search = '';
  return logo.href;
}
