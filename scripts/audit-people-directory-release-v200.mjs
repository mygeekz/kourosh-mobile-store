import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const ensure = read('scripts/ensure-local-pwa-build.mjs');
const toolbar = read('components/people/PeopleDirectoryToolbar.tsx');
const overview = read('components/people/PeopleDirectoryOverview.tsx');
const css = read('styles/system/customers-directory-v73.css');

assert.match(version, /^v\d+$/);
assert.match(ensure, /Source release changed; rebuilding the production runtime once/);
assert.match(ensure, /\.kourosh-source-version/);
assert.match(ensure, /isDistCurrentForSource/);
assert.match(toolbar, /people-directory-toolbar__filters/);
assert.doesNotMatch(toolbar, /basis-\[148px\]/);
assert.match(overview, /data-ui-people-directory-tabs="true"/);
assert.match(css, /repeat\(auto-fit, minmax\(min\(190px, 100%\), 1fr\)\)/);
assert.match(css, /\.customers-directory-v73__list > \.customers-directory-v73__table-wrap/);

console.log('PASS Kourosh v200 People directory release/runtime audit');
