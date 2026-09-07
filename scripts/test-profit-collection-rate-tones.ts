import assert from 'node:assert/strict';

import {
  formatProfitCollectionRate,
  getProfitCollectionRateTone,
} from '../components/ProfitCollectionRateBadge';

assert.equal(getProfitCollectionRateTone(75.1), 'good', 'rates above 75 percent must be green');
assert.equal(getProfitCollectionRateTone(75), 'warn', '75 percent belongs to the yellow interval');
assert.equal(getProfitCollectionRateTone(45), 'warn', '45 percent belongs to the yellow interval');
assert.equal(getProfitCollectionRateTone(44.9), 'bad', 'rates below 45 percent must be red');
assert.equal(getProfitCollectionRateTone(-10), 'bad', 'negative input must clamp to the red zero state');
assert.equal(getProfitCollectionRateTone(120), 'good', 'rates above 100 must clamp to the green full state');
assert.equal(formatProfitCollectionRate(67.7966), '۶۷٫۸٪', 'collection rates must render with one Persian decimal');

console.log('Profit collection rate semantic tone guard passed.');
