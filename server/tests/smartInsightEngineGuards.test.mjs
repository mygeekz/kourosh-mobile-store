import assert from 'node:assert/strict';

const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

function buildExecutiveScore({ signalsScore = 0, avgConfidence = 0, urgentCount = 0, profitQuality = 0, realMargin = 0, auditRiskCount = 0, decisionWinRate = 0 }) {
  return Math.max(0, Math.min(100, Math.round(
    (num(signalsScore) * 0.22) +
    (num(avgConfidence) * 0.18) +
    (Math.max(0, 100 - num(urgentCount) * 11) * 0.18) +
    ((num(profitQuality) || Math.max(0, Math.min(100, num(realMargin) * 4))) * 0.18) +
    (Math.max(0, 100 - num(auditRiskCount) * 9) * 0.14) +
    ((num(decisionWinRate) || 55) * 0.10)
  )));
}

const healthy = buildExecutiveScore({ signalsScore: 95, avgConfidence: 90, urgentCount: 0, profitQuality: 88, auditRiskCount: 0, decisionWinRate: 85 });
const risky = buildExecutiveScore({ signalsScore: 45, avgConfidence: 50, urgentCount: 5, profitQuality: 25, auditRiskCount: 7, decisionWinRate: 10 });
const marginFallback = buildExecutiveScore({ signalsScore: 70, avgConfidence: 70, urgentCount: 1, profitQuality: 0, realMargin: 18, auditRiskCount: 1, decisionWinRate: 0 });

assert.ok(healthy >= 85, `healthy store should score high, got ${healthy}`);
assert.ok(risky < healthy, 'risky signals must reduce the executive score');
assert.ok(marginFallback > 0, 'engine must fall back to real margin when qualityScore is unavailable');
assert.equal(buildExecutiveScore({ urgentCount: 999, auditRiskCount: 999 }), 6, 'score must stay bounded and penalize extreme risk');

console.log('Smart Insight Engine guard tests passed.');
