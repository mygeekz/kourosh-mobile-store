/*
 * Kourosh dev preloader: filters only the known PostCSS `from` warning before
 * Vite and PostCSS are loaded. It does not hide other warnings or errors.
 */
const POSTCSS_FROM_WARNING = 'A PostCSS plugin did not pass the `from` option to `postcss.parse`';
const shouldFilter = (value) => String(value ?? '').includes(POSTCSS_FROM_WARNING);

const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  if (args.some(shouldFilter)) return;
  originalWarn(...args);
};

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  if (shouldFilter(warning)) return;
  return originalEmitWarning(warning, ...args);
};

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...args) => {
  if (shouldFilter(chunk)) {
    const callback = args.find((arg) => typeof arg === 'function');
    if (callback) callback();
    return true;
  }
  return originalStderrWrite(chunk, ...args);
};

try {
  const postcss = require('postcss');
  if (postcss && !postcss.__kouroshParseFromGuard) {
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
} catch {
  // PostCSS is optional at preload time; Vite will load it later.
}
