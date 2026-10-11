// Test/audit loader. Explicit module allowlist; never imports application startup.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import moment from 'jalali-moment';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
export const readSource = file => fs.readFileSync(root + file, 'utf8').replaceAll('\r\n', '\n');
export function compile(source, bindings = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports,
    require(name) { throw Error('Unapproved import: ' + name); },
    fetch() { throw Error('Network forbidden'); }, ...bindings,
  }, { timeout: 5000 });
  return module.exports;
}
export function extract(file, names) {
  const text = readSource(file);
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text)) {
      found.set(node.name.text, `export const ${node.getText(ast)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return names.map(name => { if (!found.has(name)) throw Error('Source declaration missing: ' + name); return found.get(name); }).join('\n');
}
export function loadShadowModules() {
  const allowed = ['notificationRuleTypes', 'notificationTemplateRegistry', 'evaluateNotificationRules', 'notificationRuleShadow', 'schedulerRuleShadow', 'smsReminderRuleReadiness'];
  const loaded = new Map(), imports = [];
  const load = name => {
    if (!allowed.includes(name)) throw Error('Forbidden module: ' + name);
    if (loaded.has(name)) return loaded.get(name);
    const result = compile(readSource(`server/notifications/rules/${name}.ts`), {
      require(specifier) {
        imports.push(specifier);
        if (specifier === 'jalali-moment') return moment;
        if (specifier === '../../../shared/messages') return compile(readSource('shared/messages.ts'));
        if (specifier === '../../../shared/notifications/smsReminderRule') return compile(readSource('shared/notifications/smsReminderRule.ts'));
        if (!specifier.startsWith('./')) throw Error('Forbidden module: ' + specifier);
        return load(specifier.slice(2));
      }, console: { warn() {}, info() {}, error() {} },
    });
    loaded.set(name, result); return result;
  };
  return { ...load('schedulerRuleShadow'), ...load('notificationRuleShadow'), ...load('smsReminderRuleReadiness'), imports };
}

// Executes the EXACT existing SELECT loaders and allocation helpers with a read-only
// connection. No copied accounting formula; unselected declarations/imports cannot run.
export function readOnlyCandidateReaders(db) {
  const query = (sql, args = [], all = false) => {
    if (!/^\s*SELECT\b/i.test(sql)) throw Error('Non-SELECT rejected');
    return db.prepare(sql)[all ? 'all' : 'get'](...args);
  };
  const getAsync = async (sql, args) => query(sql, args), allAsync = async (sql, args) => query(sql, args, true);
  const accounting = compile(extract('shared/accounting/accountingCore.ts', ['asFiniteAccountingMoney', 'calculateInstallmentContractAccountingState']));
  const state = compile(extract('server/db/domains/installmentAccounting.db.ts', ['getInstallmentSaleReceivableState']), { getAsync, ...accounting });
  const candidates = compile(extract('server/db/domains/installments.db.ts', [
    'applySaleLevelReceiptsToInstallmentRows', 'getPendingInstallmentPaymentsWithCustomer', 'getPendingInstallmentChecksWithCustomer',
  ]), { getAsync, allAsync, getDbInstance: async () => db, ...state });
  const rules = compile(extract('server/utils/reminderRuntimeHelpers.ts', ['getEnabledReminderRules']), { allAsync });
  const smsSource = compile(extract('server/db/domains/installmentLedger.db.ts', ['getInstallmentPaymentDetailsForSms']), { getAsync, getDbInstance: async () => db });
  return { ...candidates, ...rules, ...state, ...smsSource, getAsync, allAsync };
}
