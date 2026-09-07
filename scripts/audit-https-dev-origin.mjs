import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
const httpsBatch = fs.readFileSync(path.join(root, 'start_https.bat'), 'utf8');
const productionServer = fs.readFileSync(path.join(root, 'scripts/serve-local-pwa.mjs'), 'utf8');

const httpsScript = String(packageJson.scripts?.['dev:https'] || '');
assert.match(httpsScript, /npm run server/, 'dev:https must start the backend');
assert.match(httpsScript, /npm run vite-dev/, 'dev:https must start Vite');
assert.doesNotMatch(httpsScript, /proxy-server\.mjs/, 'dev:https must not start the HTTP port-80 proxy');
assert.equal(packageJson.scripts?.['start:https'], 'npm run https:bootstrap && npm run pwa:build:ensure && npm run serve:https', 'start:https must establish trust, prepare and serve the production HTTPS PWA runtime');
assert.match(String(packageJson.scripts?.['serve:https'] || ''), /--kill-others-on-fail[\s\S]*npm run server:runtime[\s\S]*serve-local-pwa\.mjs[\s\S]*local-domain:redirect/, 'serve:https must start the non-watch backend, dedicated HTTPS production server and redirector as one failure-safe unit');
assert.doesNotMatch(String(packageJson.scripts?.['serve:https'] || ''), /pwa:preview/, 'Daily HTTPS runtime must not use Vite preview as its production server');
assert.match(productionServer, /https\.createServer\(tlsOptions, requestHandler\)/, 'Dedicated production runtime must terminate HTTPS itself');
assert.match(productionServer, /headers\['x-forwarded-proto'\] = testHttpMode \? 'http' : 'https'/, 'Dedicated runtime must preserve HTTPS semantics through its loopback API proxy');

assert.match(viteConfig, /origin:\s*undefined/, 'Vite dev assets must remain same-origin with the current browser URL');
assert.doesNotMatch(viteConfig, /origin:\s*[^\n]*publicOrigin/, 'Vite must not pin dev asset URLs to one LAN host');
assert.match(viteConfig, /const HMR_PROTOCOL = DISABLE_HTTPS \? 'ws' : 'wss'/, 'HMR protocol must follow HTTP versus HTTPS mode');
assert.match(viteConfig, /hmr:\s*\{[\s\S]*protocol:\s*HMR_PROTOCOL[\s\S]*clientPort:\s*PUBLIC_PORT/, 'HMR must use the current-origin host with the selected protocol and client port');
assert.doesNotMatch(viteConfig, /hmr:\s*\{[\s\S]{0,240}host:/, 'HMR must not pin the browser to one hostname');

assert.match(httpsBatch, /set "VITE_PUBLIC_HOST="/, 'HTTPS launcher must clear any inherited fixed Vite host');
assert.match(httpsBatch, /VITE_PUBLIC_PORT=5173/, 'HTTPS launcher must publish port 5173 for HMR');
assert.match(httpsBatch, /set "VITE_PUBLIC_PROTOCOL="/, 'HTTPS launcher must not force absolute asset URLs');
assert.match(httpsBatch, /npm run start:https/, 'HTTPS launcher must use the reviewed production HTTPS script');
assert.doesNotMatch(httpsBatch, /npm run dev\s+--\s+--host/, 'HTTPS launcher must not route through the mixed proxy dev command');

console.log('[setup] HTTPS runtime origin audit passed (same-origin dev assets + dedicated production PWA server)');
