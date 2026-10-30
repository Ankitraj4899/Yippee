/* eslint-env mocha */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildJsonLd, injectJsonLd, logoFromNav, minutesOf, isoDuration, decodeEntities,
} from '../../../scripts/jsonld.js';

const SITE = 'https://www.example.com';
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const byType = (doc, type) => doc['@graph'].find((node) => node['@type'] === type);
const logo = logoFromNav(fixture('nav.html'), SITE);
const recipes = JSON.parse(fixture('query-index.json')).data.filter((r) => r.path.startsWith('/recipes/'));

describe('buildJsonLd', () => {
  it('describes the organization, website and page on the homepage', () => {
    const doc = buildJsonLd(fixture('home.html'), { url: `${SITE}/`, logo });
    assert.equal(doc['@context'], 'https://schema.org');
    const org = byType(doc, 'Organization');
    assert.equal(org['@id'], `${SITE}/#organization`);
    assert.equal(org.name, 'Sunfeast YiPPee!');
    assert.match(org.logo.url, /^https:\/\/www\.example\.com\/media_[0-9a-f]+\.png$/);
    assert.equal(org.parentOrganization.name, 'ITC Limited');
    assert.equal(byType(doc, 'WebSite').publisher['@id'], org['@id']);
    const page = byType(doc, 'WebPage');
    assert.equal(page.url, `${SITE}/`);
    assert.ok(page.description);
    assert.equal(byType(doc, 'BreadcrumbList'), undefined);
    assert.equal(byType(doc, 'Recipe'), undefined);
  });

  it('builds a full Recipe from a recipe page', () => {
    const doc = buildJsonLd(fixture('pasta-tikki.html'), { url: `${SITE}/recipes/pasta-tikki`, logo });
    const recipe = byType(doc, 'Recipe');
    assert.equal(recipe.name, 'Yippee Pasta Tikki');
    assert.equal(recipe['@id'], `${SITE}/recipes/pasta-tikki#recipe`);
    assert.equal(recipe.recipeCategory, 'Pasta');
    assert.equal(recipe.prepTime, 'PT10M');
    assert.equal(recipe.cookTime, 'PT10M');
    assert.equal(recipe.totalTime, 'PT20M');
    assert.equal(recipe.recipeYield, '4 servings');
    assert.equal(recipe.recipeIngredient.length, 10);
    assert.equal(recipe.recipeIngredient[2], '¼ cup grated cheese');
    assert.equal(recipe.recipeInstructions.length, 6);
    assert.deepEqual(recipe.recipeInstructions[0], {
      '@type': 'HowToStep', position: 1, text: 'Boil the pasta for 5 minutes, drain well and let it cool. Chop it roughly.',
    });
    assert.match(recipe.image[0], /media_[0-9a-f]+\.jpg/);
    assert.ok(recipe.description.startsWith('Golden, crispy'));
    assert.equal(recipe.author['@id'], `${SITE}/#organization`);

    const crumbs = byType(doc, 'BreadcrumbList').itemListElement;
    assert.deepEqual(crumbs.map((c) => c.name), ['Home', 'Recipes', 'Yippee Pasta Tikki Recipe']);
    assert.deepEqual(crumbs.map((c) => c.item), [`${SITE}/`, `${SITE}/recipes`, `${SITE}/recipes/pasta-tikki`]);
  });

  it('marks vegetarian recipes and leaves other diets out', () => {
    const page = (diet) => fixture('pasta-tikki.html').replace('</head>', `<meta name="diet" content="${diet}"></head>`);
    const veg = byType(buildJsonLd(page('Veg'), { url: `${SITE}/recipes/pasta-tikki` }), 'Recipe');
    assert.equal(veg.suitableForDiet, 'https://schema.org/VegetarianDiet');
    const nonVeg = byType(buildJsonLd(page('Non Veg'), { url: `${SITE}/recipes/pasta-tikki` }), 'Recipe');
    assert.equal(nonVeg.suitableForDiet, undefined);
  });

  it('leaves out the image of a recipe without a photo', () => {
    const doc = buildJsonLd(fixture('noodle-manchurian.html'), { url: `${SITE}/recipes/noodle-manchurian`, logo });
    const recipe = byType(doc, 'Recipe');
    assert.equal(recipe.name, 'Yippee Noodle Manchurian');
    assert.ok(recipe.recipeIngredient.length > 0);
    assert.ok(recipe.recipeInstructions.length > 0);
  });

  it('lists every recipe on the recipes page', () => {
    const doc = buildJsonLd(fixture('recipes.html'), { url: `${SITE}/recipes`, logo, recipes });
    const page = byType(doc, 'CollectionPage');
    const list = byType(doc, 'ItemList');
    assert.equal(page.mainEntity['@id'], list['@id']);
    assert.equal(list.numberOfItems, recipes.length);
    assert.ok(list.itemListElement.length >= 25);
    assert.ok(list.itemListElement.every((item) => item.url.startsWith(`${SITE}/recipes/`) && item.name));
  });

  it('lists the products of the product listing page', () => {
    const doc = buildJsonLd(fixture('product-listing.html'), { url: `${SITE}/product-listing`, logo });
    const page = byType(doc, 'CollectionPage');
    const list = byType(doc, 'ItemList');
    assert.equal(page.mainEntity['@id'], list['@id']);
    assert.equal(list.numberOfItems, 16);
    const first = list.itemListElement[0];
    assert.equal(first.position, 1);
    assert.equal(first.item['@type'], 'Product');
    assert.equal(first.item.name, 'Magic Masala Noodles');
    assert.match(first.item.image, /^https:\/\/s7ap1\.scene7\.com\/is\/image\/itcportalprod\/346x265-04\?/);
    assert.equal(first.item.brand.name, 'Sunfeast YiPPee!');
    assert.equal(list.itemListElement.at(-1).item.name, 'Korean Spicy Kimchi Style');
  });

  it('reads pack images that AEM delivers as links', () => {
    // AEM renders an outside image address without a file extension as a link
    const html = fixture('product-listing.html')
      .replace(/<picture><img src="([^"]+)" alt="([^"]+)"[^>]*><\/picture>/g, '<a href="$1">$2</a>');
    const list = byType(buildJsonLd(html, { url: `${SITE}/product-listing` }), 'ItemList');
    assert.equal(list.numberOfItems, 16);
    assert.match(list.itemListElement[1].item.image, /346x265-05/);
  });

  it('uses the public domain, not the aem.live canonical host', () => {
    const doc = buildJsonLd(fixture('pasta-tikki.html'), { url: `${SITE}/recipes/pasta-tikki` });
    const json = JSON.stringify(doc);
    assert.ok(!json.includes('"@id":"https://main--'));
    assert.equal(byType(doc, 'WebPage').url, `${SITE}/recipes/pasta-tikki`);
  });

  it('describes a blog article as a BlogPosting with its FAQs', () => {
    const url = `${SITE}/blog-listing/korean-noodles`;
    const doc = buildJsonLd(fixture('blog-article.html'), { url, logo });
    const post = byType(doc, 'BlogPosting');
    assert.equal(post['@id'], `${url}#article`);
    assert.equal(post.headline, 'New to Korean Noodles? Start Right Here');
    assert.equal(post.name, "Korean Noodles: A Complete Beginner's Guide");
    assert.equal(post.datePublished, '2026-09-16');
    assert.equal(post.articleSection, 'Noodles');
    assert.deepEqual(post.author, { '@type': 'Organization', name: 'Yippee Culinary Team' });
    assert.equal(post.publisher['@id'], `${SITE}/#organization`);
    assert.match(post.image[0], /media_1a2b3c4d\.jpg/);
    const faq = byType(doc, 'FAQPage');
    assert.equal(faq.mainEntity.length, 5);
    assert.equal(faq.mainEntity[0].name, '1. Is Korean-style instant noodles the same as ramen?');
    assert.match(faq.mainEntity[0].acceptedAnswer.text, /^Not exactly\./);
    const crumbs = byType(doc, 'BreadcrumbList').itemListElement.map((c) => c.name);
    assert.deepEqual(crumbs, ['Home', 'Blog Listing', "Korean Noodles: A Complete Beginner's Guide"]);
  });

  it('adds no article or FAQ data to other pages', () => {
    const doc = buildJsonLd(fixture('pasta-tikki.html'), { url: `${SITE}/recipes/pasta-tikki`, logo });
    assert.equal(byType(doc, 'BlogPosting'), undefined);
    assert.equal(byType(doc, 'FAQPage'), undefined);
  });

  it('skips fragments and noindex pages', () => {
    assert.equal(buildJsonLd(fixture('nav.html'), { url: `${SITE}/nav.plain.html` }), null);
    const noindex = fixture('pasta-tikki.html').replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
    assert.equal(buildJsonLd(noindex, { url: `${SITE}/recipes/pasta-tikki` }), null);
  });
});

describe('injectJsonLd', () => {
  const html = '<html><head><title>x</title></head><body></body></html>';

  it('adds one script just before </head>', () => {
    const out = injectJsonLd(html, { name: 'a' });
    assert.equal(out, '<html><head><title>x</title><script type="application/ld+json">{"name":"a"}</script>\n</head><body></body></html>');
  });

  it('escapes "<" so the data cannot close the script', () => {
    const out = injectJsonLd(html, { name: '</script><script>alert(1)</script>' });
    assert.ok(!out.includes('</script><script>alert'));
    const json = out.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    assert.equal(JSON.parse(json).name, '</script><script>alert(1)</script>');
  });

  it('keeps JSON-LD that the page already has', () => {
    const existing = html.replace('</head>', '<script type="application/ld+json">{}</script></head>');
    assert.equal(injectJsonLd(existing, { name: 'a' }), existing);
  });

  it('keeps the HTML unchanged without a head or data', () => {
    assert.equal(injectJsonLd('<div>fragment</div>', { name: 'a' }), '<div>fragment</div>');
    assert.equal(injectJsonLd(html, null), html);
  });
});

describe('helpers', () => {
  it('turns cooking times into ISO 8601 durations', () => {
    assert.equal(isoDuration(minutesOf('20 mins')), 'PT20M');
    assert.equal(isoDuration(minutesOf('1 hr 10 mins')), 'PT1H10M');
    assert.equal(isoDuration(minutesOf('2 hours')), 'PT2H');
    assert.equal(isoDuration(minutesOf('45')), 'PT45M');
    assert.equal(isoDuration(minutesOf('quick')), undefined);
  });

  it('decodes entities', () => {
    assert.equal(decodeEntities('a&#x26;b &amp; &lt;c&gt; &#39;d&#39;'), "a&b & <c> 'd'");
  });
});
