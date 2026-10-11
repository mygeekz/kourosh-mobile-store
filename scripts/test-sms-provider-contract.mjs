import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { providerTemplateBindings } from "../server/notifications/rules/providerTemplateBindings.ts";
import {
  MELI_PAYAMAK_PATTERN_DEFINITIONS,
  buildMeliPayamakPatternTokens,
} from "../shared/messages.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const expected = {
  installment_due_notice: {
    settingKey: "meli_payamak_installment_due_notice_pattern_id",
    tokenKeys: ["name", "amount", "dueDate"],
  },
  installment_overdue: {
    settingKey: "meli_payamak_installment_overdue_pattern_id",
    tokenKeys: ["name", "amount", "dueDate"],
  },
};

for (const [templateKey, contract] of Object.entries(expected)) {
  const binding = providerTemplateBindings[templateKey];
  assert.ok(binding, `${templateKey}: provider binding missing`);
  assert.equal(binding.provider, "meli_payamak", `${templateKey}: unexpected provider`);
  assert.equal(binding.settingKey, contract.settingKey, `${templateKey}: setting key mismatch`);
  assert.deepEqual([...binding.tokenKeys], contract.tokenKeys, `${templateKey}: binding token order mismatch`);

  const providerDefinition = MELI_PAYAMAK_PATTERN_DEFINITIONS.find((item) => item.key === contract.settingKey);
  assert.ok(providerDefinition, `${templateKey}: central provider definition missing`);
  assert.deepEqual([...providerDefinition.tokenKeys], contract.tokenKeys, `${templateKey}: central catalog token order mismatch`);

  const built = buildMeliPayamakPatternTokens(contract.settingKey, {
    name: "ن",
    amount: "100",
    dueDate: "1405/06/01",
  });
  assert.deepEqual(built, ["ن", "100", "1405/06/01"], `${templateKey}: runtime token builder mismatch`);
}

const registrySource = read("server/notifications/rules/notificationTemplateRegistry.ts");
assert.match(registrySource, /key:\s*["']installment_due_notice["'][\s\S]*?requiredVariables:\s*\[["']name["'],\s*["']amount["'],\s*["']dueDate["']\]/,
  "installment_due_notice: semantic registry order mismatch");
assert.match(registrySource, /key:\s*["']installment_overdue["'][\s\S]*?requiredVariables:\s*\[["']name["'],\s*["']amount["'],\s*["']dueDate["']\]/,
  "installment_overdue: semantic registry order mismatch");

const readinessSource = read("server/notifications/rules/smsReminderRuleReadiness.ts");
assert.match(readinessSource, /providerTemplateBindings/,
  "readiness must consume providerTemplateBindings");
assert.ok(!readinessSource.includes("if (contract.eventType === 'INSTALLMENT_DUE') return { settingKey: 'meli_payamak_installment_due_notice_pattern_id'"),
  "readiness must not duplicate installment due provider binding");
assert.ok(!readinessSource.includes("if (contract.eventType === 'INSTALLMENT_OVERDUE') return { settingKey: 'meli_payamak_installment_overdue_pattern_id'"),
  "readiness must not duplicate installment overdue provider binding");

console.log(JSON.stringify({
  status: "PASS",
  tests: Object.keys(expected),
  verifiedLayers: ["provider_binding", "semantic_registry", "central_pattern_catalog", "runtime_token_builder", "readiness_wiring"],
}, null, 2));
