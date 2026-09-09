// app.json is the source of truth for the config. This file only adds one
// override: when building the static export for GitHub Pages, the app is
// served from a subpath (https://<user>.github.io/GeriPaws/) instead of a
// domain root, so every asset/script URL and the router's own base path
// need that prefix. Local dev and native builds are untouched.
module.exports = ({ config }) => {
  if (process.env.GH_PAGES_BUILD === '1') {
    config.experiments = {
      ...config.experiments,
      baseUrl: '/GeriPaws',
    };
  }
  return config;
};
