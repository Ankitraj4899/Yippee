// runs on Fastly Compute (service worker style), not in the browser
module.exports = {
  env: {
    browser: false,
    serviceworker: true,
    node: true,
    mocha: true,
  },
  rules: {
    'import/no-unresolved': ['error', { ignore: ['^fastly:'] }],
    'no-restricted-globals': 'off', // addEventListener('fetch') is the Compute entry point
    'no-console': 'off', // console output goes to `aio aem edge-functions tail-logs`
  },
};
