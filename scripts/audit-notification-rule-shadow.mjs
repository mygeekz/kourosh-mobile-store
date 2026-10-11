// Explicit read-only audit. Does not load/call runAutoSendRulesOnce or any sender.
import { DatabaseSync } from 'node:sqlite';
import moment from 'jalali-moment';
import { fileURLToPath } from 'node:url';
import { compile, extract, loadShadowModules, readOnlyCandidateReaders } from './lib/notification-rule-shadow-harness.mjs';

const db = new DatabaseSync(fileURLToPath(new URL('../server/kourosh_inventory.db', import.meta.url)), { readOnly: true });
const shadow = loadShadowModules();
const { normalizeAutoSendMode: normalizeMode } = compile(extract('server/utils/telegramRuntimeHelpers.ts', ['normalizeAutoSendMode']));
try {
  db.exec('PRAGMA busy_timeout=15000; PRAGMA query_only=ON');
  db.exec('BEGIN'); // stable read transaction; no INSERT/UPDATE or schema initialization
  const readers = readOnlyCandidateReaders(db);
  const settingKeys = [...new Set([...shadow.smsReminderSettingKeys, 'installation_id', 'sms_provider', 'auto_send_installment_due', 'auto_send_check_due',
    'meli_payamak_installment_due_notice_pattern_id', 'meli_payamak_installment_due_3_pattern_id', 'meli_payamak_installment_due_7_pattern_id',
    'meli_payamak_installment_overdue_pattern_id', 'meli_payamak_check_due_today_pattern_id', 'meli_payamak_check_due_3_pattern_id', 'meli_payamak_check_due_7_pattern_id'])];
  const settings = Object.fromEntries(db.prepare(`SELECT key,value FROM settings WHERE key IN (${settingKeys.map(() => '?').join(',')})`).all(...settingKeys).map(r => [r.key, r.value]));
  const state = await shadow.prepareSchedulerRuleShadow(settings, readers);
  const now = moment();
  const activeTelegram = state.rules.some(r => r.channel === 'telegram');
  const configuredInstallmentMode = normalizeMode(settings.auto_send_installment_due);
  const installmentMode = activeTelegram ? configuredInstallmentMode === 'both' ? 'sms' : configuredInstallmentMode === 'telegram' ? 'off' : configuredInstallmentMode : configuredInstallmentMode;
  const modes = { installment: installmentMode, check: normalizeMode(settings.auto_send_check_due) };
  const report = { evaluatedAt: now.toISOString(), timezone: state.timezone, scope: 'runAutoSendRulesOnce pre-enqueue candidates; not Telegram Rule Builder tick',
    ruleCounts: { sms: state.rules.filter(r => r.channel === 'sms').length, telegram: state.rules.filter(r => r.channel === 'telegram').length },
    modes, configuredTemplateKeys: state.configuredTemplateKeys, totalCandidates: 0, channelComparisons: 0,
    exactMatches: 0, matchingAbstentions: 0, differences: 0, blockedNewDecisions: 0, reasons: {}, samples: {}, readOnly: true };
  for (const kind of ['installment', 'check']) {
    if (modes[kind] === 'off') continue;
    const rows = kind === 'installment' ? await readers.getPendingInstallmentPaymentsWithCustomer() : await readers.getPendingInstallmentChecksWithCustomer();
    const prefix = kind === 'installment' ? 'INSTALLMENT' : 'CHECK';
    const map = Object.fromEntries([0, 3, 7].map(n => [now.clone().locale('fa').add(n, 'day').format('jYYYY/jMM/jDD'), `${prefix}_DUE_${n || 'TODAY'}`]));
    for (const row of rows) {
      report.totalCandidates++;
      const outcomes = shadow.observeSchedulerRuleCandidate(state, { kind, row, mode: modes[kind], originalEventType: map[String(row.dueDate)] || null,
        legacyDate: now.clone().locale('en').format('YYYY-MM-DD'), evaluatedAt: now.toISOString() }, () => {});
      for (const result of outcomes) {
        report.channelComparisons++;
        if (!result.differences.length) {
          report.exactMatches++;
          if (!result.originalEventType && !result.evaluation.decisions.some(d => d.matched)) report.matchingAbstentions++;
        } else report.differences++;
        const blocked = result.evaluation.decisions.filter(d => !d.matched && !['RULE_DISABLED','EVENT_NOT_MATCHED','TARGET_NOT_MATCHED','NOT_DUE_YET','OCCURRENCE_PASSED','CONDITION_NOT_MET'].includes(d.reasonCode));
        report.blockedNewDecisions += blocked.length;
        const codes = new Set([...result.differences.flatMap(d => d.codes), ...blocked.map(d => d.reasonCode), ...result.adapterIssues.map(i => i.code)]);
        for (const code of codes) {
          report.reasons[code] = (report.reasons[code] || 0) + 1;
          const samples = report.samples[code] ||= [];
          if (samples.length < 2) samples.push({ sourceType: kind, sourceId: result.sourceId, customerId: result.customerId,
            originalEventType: result.originalEventType, normalizedEvent: result.normalizedEvent, channel: result.channel,
            ruleIds: result.evaluation.decisions.map(d => d.ruleId) });
        }
      }
    }
  }
  report.connectionChanges = db.prepare('SELECT total_changes() AS n').get().n;
  console.log(JSON.stringify(report, null, 2));
} catch {
  // Never print DB row contents, settings or raw exception messages.
  console.error('SHADOW_READ_ONLY_AUDIT_FAILED'); process.exitCode = 1;
} finally { try { db.exec('ROLLBACK'); } finally { db.close(); } }
