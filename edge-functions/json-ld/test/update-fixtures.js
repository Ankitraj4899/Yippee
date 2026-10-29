/* Saves live pages as test fixtures: npm run fixtures */
import { writeFile } from 'node:fs/promises';

const ORIGIN = 'https://main--yippee--ankitraj4899.aem.live';
const PAGES = {
  home: '/',
  recipes: '/recipes',
  'pasta-tikki': '/recipes/pasta-tikki',
  'noodle-manchurian': '/recipes/noodle-manchurian',
  nav: '/nav.plain.html',
  'query-index': '/query-index.json?limit=500',
};

await Promise.all(Object.entries(PAGES).map(async ([name, path]) => {
  const res = await fetch(`${ORIGIN}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const ext = path.includes('.json') ? 'json' : 'html';
  await writeFile(new URL(`./fixtures/${name}.${ext}`, import.meta.url), await res.text());
  console.log(`saved ${name}.${ext}`);
}));
