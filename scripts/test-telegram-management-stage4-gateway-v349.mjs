import assert from 'node:assert/strict';
import {
  classifyMiniAppGatewayRequest,
  isAllowedMiniAppApiPath,
} from '../server/miniapp/miniAppGatewayPolicy.mjs';

assert.equal(isAllowedMiniAppApiPath('/api/miniapp/manager/dashboard'), true);
assert.equal(isAllowedMiniAppApiPath('/api/miniapp/manager/customers/12/ledger'), true);
assert.equal(isAllowedMiniAppApiPath('/api/miniapp/manager/partners/7'), true);

assert.deepEqual(
  classifyMiniAppGatewayRequest({ method: 'GET', pathname: '/api/miniapp/manager/dashboard' }),
  { allowed: true, kind: 'api', publicPath: '/api/miniapp/manager/dashboard' },
);
assert.deepEqual(
  classifyMiniAppGatewayRequest({ method: 'POST', pathname: '/api/miniapp/auth', contentLength: 512 }),
  { allowed: true, kind: 'api', publicPath: '/api/miniapp/auth' },
);
assert.equal(classifyMiniAppGatewayRequest({ method: 'POST', pathname: '/api/miniapp/manager/dashboard' }).allowed, false);
assert.equal(classifyMiniAppGatewayRequest({ method: 'GET', pathname: '/api/miniapp/manager/dashboard', hasBody: true }).allowed, false);
assert.equal(classifyMiniAppGatewayRequest({ method: 'GET', pathname: '/api/miniapp/managers' }).allowed, false);
assert.equal(classifyMiniAppGatewayRequest({ method: 'GET', pathname: '/api/admin/users' }).allowed, false);

console.log('Telegram Management Center Stage 4 v349 gateway contract passed');
