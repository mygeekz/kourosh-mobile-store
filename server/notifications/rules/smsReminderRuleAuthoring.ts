import { getSmsReminderReadiness, smsReminderSettingKeys, validateSmsReminderContract } from './smsReminderRuleReadiness';
type Readers = { allAsync: (sql: string, params?: any[]) => Promise<any[]>; getAsync: (sql: string, params?: any[]) => Promise<any> };
export async function readSmsReminderSettings(readers: Readers) {
  const rows = await readers.allAsync(`SELECT key,value FROM settings WHERE key IN (${smsReminderSettingKeys.map(() => '?').join(',')})`, [...smsReminderSettingKeys]);
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
}
export async function smsReminderSchemaReady(readers: Readers): Promise<boolean> {
  const columns = await readers.allAsync('PRAGMA table_info(reminder_rules)');
  return ['eventType','timingType','daysOffset','templateKey'].every(name => columns.some(row => row.name === name));
}
export async function validateSmsReminderDraft(body: Record<string, unknown>, readers: Readers) {
  const [settings, schemaReady] = await Promise.all([readSmsReminderSettings(readers), smsReminderSchemaReady(readers)]);
  const { contract, errors } = validateSmsReminderContract(body);
  const validationErrors = [...errors];
  if (body.channel !== 'sms') validationErrors.push('INVALID_CHANNEL');
  if (![true,false,0,1].includes(body.enabled as any)) validationErrors.push('INVALID_ENABLED');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200) validationErrors.push('INVALID_NAME');
  const readiness = getSmsReminderReadiness(body, settings);
  if (body.enabled === true || body.enabled === 1) {
    if (!readiness.ready) validationErrors.push(readiness.reasonCode);
  }
  return { valid: validationErrors.length === 0, errors: [...new Set(validationErrors)], contract, readiness, schemaReady };
}

// Authoring only. Deliberately separate from the read-only shadow module graph.
export async function saveSmsReminderDraft(body: Record<string, unknown>, id: number | null,
  deps: Readers & { runAsync: (sql: string, params?: any[]) => Promise<any> }) {
  const validation = await validateSmsReminderDraft(body, deps);
  if (!validation.schemaReady) return { status: 409, body: { success: false, code: 'SMS_RULE_MIGRATION_REQUIRED', message: 'ساختار ذخیرهٔ قوانین پیامک هنوز آماده نشده است؛ ارتقای بررسی‌شده لازم است.' } };
  if (!validation.valid || !validation.contract) return { status: 400, body: { success: false, code: validation.errors[0], message: validation.readiness.ready ? 'مشخصات قانون را بررسی کنید.' : validation.readiness.message, errors: validation.errors } };
  const c = validation.contract;
  const matchType = c.timingType === 'AFTER_DUE_DATE' ? 'overdue_days' : 'days_until';
  const values = [String(body.name).trim(), body.enabled === true || body.enabled === 1 ? 1 : 0, 'sms', matchType, c.daysOffset,
    '', '', '', c.targetType, c.eventType, c.timingType, c.daysOffset, c.templateKey];
  if (id !== null) {
    await deps.runAsync(`UPDATE reminder_rules SET name=?,enabled=?,channel=?,matchType=?,value=?,template=?,installmentTemplate=?,checkTemplate=?,targetType=?,eventType=?,timingType=?,daysOffset=?,templateKey=?,updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=? AND channel='sms'`, [...values, id]);
    return { status: 200, body: { success: true, data: { id, readiness: validation.readiness } } };
  }
  const result = await deps.runAsync('INSERT INTO reminder_rules (name,enabled,channel,matchType,value,template,installmentTemplate,checkTemplate,targetType,eventType,timingType,daysOffset,templateKey) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', values);
  return { status: 200, body: { success: true, data: { id: result.lastID, readiness: validation.readiness } } };
}
