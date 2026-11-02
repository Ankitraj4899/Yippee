// runs on Cloudflare Workers (ES module worker), not in the browser
module.exports = {
  env: {
    browser: false,
    es2020: true,
    serviceworker: true,
    node: true,
    mocha: true,
  },
  rules: {
    'no-console': 'off', // console output goes to `wrangler tail` and Workers Logs
    // the JSON-LD builder is shared with the site (scripts/jsonld.js) and bundled by wrangler
    'import/no-relative-packages': 'off',
  },
};
