import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = fs.readFileSync(path.join(root, 'server/utils/localSettingsHelpers.ts'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts/ensure-local-https-runtime.ts'), 'utf8');

assert.equal(
  helper.includes('Import-Certificate -FilePath $RootCerPath'),
  false,
  'PowerShell certificate generation must not trigger the interactive Windows Root-store import path.',
);
assert.match(
  helper,
  /const certificateMetadata = await validateAndPublishCertificateChain\(\);[\s\S]*const trusted = await tryTrustCertificateOnWindows\(caCerPath\);/,
  'Windows PKI output must be validated before the separate certutil trust step.',
);
assert.match(
  helper,
  /runExecutable\(certutil, \["-user", "-addstore", "-f", "Root", cerPath\]\)/,
  'Current User Root trust must use non-interactive certutil with an explicit certificate path.',
);
assert.match(
  helper,
  /const preferPowerShell = !hasReusableRoot \|\| existingProfileMode === "windows-pfx"/,
  'Windows built-in PKI must remain the primary fresh-install generator when OpenSSL is unavailable.',
);
assert.match(
  bootstrap,
  /execFileAsync\(certutil, \['-user', '-addstore', '-f', 'Root', rootCerPath\]/,
  'HTTPS bootstrap must reassert Current User Root trust independently after generation.',
);

console.log('Windows certificate bootstrap contract passed (non-interactive PKI generation, separate certutil trust, no required OpenSSL).');
