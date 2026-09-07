const postcss = require('postcss');

// Kourosh CSS pipeline guard:
// Some third-party PostCSS/Tailwind plugins call postcss.parse(css) without an
// explicit `from` option. PostCSS then prints:
// "A PostCSS plugin did not pass the `from` option to `postcss.parse`...".
// Passing `from: undefined` is the documented safe value for inline CSS snippets:
// it suppresses the warning without pretending that generated snippets belong to
// a real source file, so asset URL resolution remains predictable.
if (!postcss.__kouroshParseFromGuard) {
  const originalParse = postcss.parse.bind(postcss);
  postcss.parse = (css, opts) => {
    const normalizedOpts = opts && Object.prototype.hasOwnProperty.call(opts, 'from')
      ? opts
      : { ...(opts || {}), from: undefined };
    return originalParse(css, normalizedOpts);
  };
  Object.defineProperty(postcss, '__kouroshParseFromGuard', {
    value: true,
    enumerable: false,
    configurable: false,
  });
}

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
