import moment from 'jalali-moment';
import { formatExactNumberText } from '../../utils/exactNumber';
import { installmentsRepo } from '../repositories/installments.repo';
import {
  addAuditLog,
  getAllSettingsAsObject,
  getInstallmentSaleDetailsForSms,
} from '../database';
import { validateInstallmentSalePayload } from '../validators';
import type { InstallmentSalePayload } from '../../types';
import {
  sendIppanelPatternSms,
  sendKavenegarPatternSms,
  sendMeliPayamakPatternSms,
  sendSmsIrPatternSms,
} from '../smsService';
import { sendTelegramMessage, setTelegramProxy } from '../telegramService';

type NotifyCustomer = (
  eventType: string,
  refId: number,
  channels: string,
  extra?: Record<string, any>,
) => Promise<any>;
type AuditUser = { id: any; username: any; roleName: any } | undefined | null;

type InsertSmsLog = (x: {
  reqUser?: { id?: number; username?: string };
  provider: string;
  eventType?: string;
  entityType?: string;
  entityId?: number | null;
  recipient: string;
  eventKey?: string | null;
  capCustomerId?: number | null;
  patternId?: string;
  tokens?: string[];
  success: boolean;
  response?: any;
  error?: string;
  request?: any;
  httpStatus?: number;
  rawResponseText?: string;
  durationMs?: number;
  correlationId?: string;
  relatedLogId?: number;
}) => Promise<any>;

type CreateInstallmentSaleOptions = {
  payload: InstallmentSalePayload;
  user?: AuditUser;
  notifyCustomer?: NotifyCustomer;
};

type RecordInstallmentPaymentTransactionOptions = {
  paymentId: number;
  body: any;
  reqUser?: { id?: number; username?: string };
  notifyCustomer?: NotifyCustomer;
  insertSmsLog?: InsertSmsLog;
};

const REPORT_CURRENCY_CONTRACT = {
  currencyBase: 'TOMAN',
  displayCurrency: 'تومان',
  moneyDivisor: 1,
} as const;

const parsePositiveMoneyAmount = (value: any): number => {
  const normalized = Number(
    String(value ?? '')
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^\d.-]/g, ''),
  );
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
};

const normalizeInstallmentCashPaymentDate = (date: any): string | null => {
  const isoDate = moment(
    date,
    ['jYYYY/jMM/jDD', 'YYYY/MM/DD', 'YYYY-MM-DD', moment.ISO_8601],
    true,
  )
    .locale('en')
    .format('YYYY-MM-DD');
  return moment(isoDate, 'YYYY-MM-DD', true).isValid() ? isoDate : null;
};

const formatPriceForSms = (price: number): string => {
  const n = Number(price || 0);
  const toman = Number.isFinite(n) ? n / REPORT_CURRENCY_CONTRACT.moneyDivisor : 0;
  return formatExactNumberText(toman);
};

const escapeHtml = (s: any) => {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderTpl = (tpl: string, vars: Record<string, any>) =>
  String(tpl ?? '').replace(/\{(\w+)\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return String(v);
  });

const renderTplHtml = (tpl: string, vars: Record<string, any>) => {
  const safeVars: Record<string, any> = {};
  for (const k of Object.keys(vars || {})) safeVars[k] = escapeHtml((vars as any)[k]);
  return renderTpl(String(tpl ?? ''), safeVars);
};

const markdownishToHtml = (tpl: string) => {
  const s = String(tpl ?? '');
  const b = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return b.replace(/__(.+?)__/g, '<i>$1</i>');
};

const sanitizeTelegramHtml = (html: string): string => {
  let s = String(html || '');
  s = s.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)(.|\n|\r)*?<\s*\/\s*\1\s*>/gi,
    '',
  );
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/>/gi, '');
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  s = s.replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
  s = s.replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, '$1="#"');
  return s;
};

const CHECK_STATUSES_OPTIONS_SERVER = [
  'نزد فروشنده',
  'در جریان وصول',
  'نقد شد',
  'برگشت خورد',
  'به مشتری برگشت داده شده',
];

export const installmentsService = {
  listInstallmentSales: () => installmentsRepo.listInstallmentSales(),
  listInstallmentSalesDirectory: (query: Parameters<typeof installmentsRepo.listInstallmentSalesDirectory>[0]) =>
    installmentsRepo.listInstallmentSalesDirectory(query),
  listInstallmentSalesForCustomer: (customerId: number) =>
    installmentsRepo.listInstallmentSalesForCustomer(customerId),
  listInstallmentCustomerDueOverview: (customerIds?: number[]) =>
    installmentsRepo.listInstallmentCustomerDueOverview(customerIds),
  getInstallmentSaleById: (id: number) => installmentsRepo.getInstallmentSaleById(id),
  getInstallmentSaleProfitSnapshot: (id: number) =>
    installmentsRepo.getInstallmentSaleProfitSnapshot(id),
  deleteInstallmentSale: async (_id: number) => {
    throw new Error('قرارداد نهایی اقساطی حذف نمی‌شود؛ برای حفظ تاریخچه مالی از عملیات فسخ قرارداد استفاده کنید.');
  },
  getInstallmentCancellationPreview: (id: number, mode: any) =>
    installmentsRepo.getCancellationPreview(id, mode),
  getInstallmentCancellationRefundState: (id: number) =>
    installmentsRepo.getCancellationRefundState(id),
  addInstallmentCancellationRefund: async ({ saleId, body, user }: { saleId: number; body: any; user?: AuditUser }) => {
    const amount = Number(body?.amount || 0);
    const paymentDate = String(body?.paymentDate || '').trim();
    const paymentMethod = String(body?.paymentMethod || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) return { validationMessage: 'مبلغ بازپرداخت باید بیشتر از صفر باشد.' };
    if (!paymentDate) return { validationMessage: 'تاریخ بازپرداخت الزامی است.' };
    if (!['cash', 'card', 'bank_transfer', 'other'].includes(paymentMethod)) {
      return { validationMessage: 'روش بازپرداخت معتبر نیست.' };
    }
    const data = await installmentsRepo.addCancellationRefund(saleId, {
      amount,
      paymentDate,
      paymentMethod,
      referenceNo: String(body?.referenceNo || '').trim() || null,
      notes: String(body?.notes || '').trim() || null,
      userId: user?.id ?? null,
      username: user?.username ?? null,
    });
    if (user) {
      try {
        await addAuditLog(
          user.id,
          user.username,
          user.roleName,
          'refund',
          'installment_sale_cancellation',
          saleId,
          `بازپرداخت فسخ قرارداد اقساطی #${saleId} | مبلغ: ${amount} | روش: ${paymentMethod}`,
        );
      } catch {}
    }
    return { data };
  },
  cancelInstallmentSale: async ({ saleId, body, user }: { saleId: number; body: any; user?: AuditUser }) => {
    const reason = String(body?.reason || '').trim();
    if (!reason) return { validationMessage: 'ثبت دلیل فسخ قرارداد الزامی است.' };
    const mode = body?.mode === 'full_reversal' ? 'full_reversal' : 'review_required';
    const data = await installmentsRepo.cancelInstallmentSale(saleId, {
      reason,
      mode,
      returnPhysicalItems: Boolean(body?.returnPhysicalItems),
      returnUnusedChecks: Boolean(body?.returnUnusedChecks),
      userId: user?.id ?? null,
      username: user?.username ?? null,
    });
    if (user) {
      try {
        await addAuditLog(
          user.id,
          user.username,
          user.roleName,
          'cancel',
          'installment_sale',
          saleId,
          `فسخ قرارداد اقساطی #${saleId} | حالت: ${mode} | دلیل: ${reason}`,
        );
      } catch {}
    }
    return { data };
  },
  updateInstallmentPaymentStatus: (id: number, paid: boolean, paymentDate?: any) =>
    installmentsRepo.updateInstallmentPaymentStatus(id, paid, paymentDate),
  updateInstallmentCheckStatus: async (
    id: number,
    status: any,
    notifyCustomer?: NotifyCustomer,
  ) => {
    if (!CHECK_STATUSES_OPTIONS_SERVER.includes(status)) {
      return { validationMessage: 'وضعیت چک نامعتبر است.' };
    }

    const ok = await installmentsRepo.updateInstallmentCheckStatus(id, status);

    try {
      if (ok && /برگشت/.test(String(status)) && notifyCustomer) {
        await notifyCustomer('CHECK_FAILED', id, 'both');
      }
    } catch {}

    return { ok };
  },

  addCheckRecoveryPayment: async (checkId: number, body: any) => {
    const { amount, date, notes } = body || {};
    const normalizedAmount = parsePositiveMoneyAmount(amount);
    if (!normalizedAmount || !date) {
      return { validationMessage: 'مبلغ و تاریخ دریافت نقدی الزامی است.' };
    }

    const isoDate = normalizeInstallmentCashPaymentDate(date);
    if (!isoDate) {
      return { validationMessage: 'فرمت تاریخ نامعتبر است.' };
    }

    const data = await installmentsRepo.addCheckRecoveryPayment(
      checkId,
      normalizedAmount,
      isoDate,
      notes,
    );
    return { data };
  },

  createInstallmentSale: async ({ payload, user, notifyCustomer }: CreateInstallmentSaleOptions) => {
    const errors = validateInstallmentSalePayload(payload);
    if (errors.length) {
      return { validationMessage: errors.join(' ') };
    }

    const data = await installmentsRepo.createInstallmentSale(payload);

    try {
      if (data?.id && notifyCustomer) {
        await notifyCustomer('INSTALLMENT_SALE_CREATED', Number(data.id), 'both');
      }
    } catch (notifyErr) {
      console.warn('installment created notify failed:', notifyErr);
    }

    try {
      if (data?.customerId && notifyCustomer) {
        await notifyCustomer('ACCOUNT_BALANCE_STATUS', Number(data.customerId), 'both');
      }
    } catch {}

    if (user) {
      try {
        addAuditLog(
          user.id,
          user.username,
          user.roleName,
          'create',
          'installment_sale',
          data?.id || null,
          `ثبت فروش اقساطی #${data?.id ?? ''}`,
        );
      } catch {}
    }

    return { data };
  },

  recordInstallmentPaymentTransaction: async ({
    paymentId,
    body,
    reqUser,
    notifyCustomer,
    insertSmsLog,
  }: RecordInstallmentPaymentTransactionOptions) => {
    const { amount, date, notes } = body || {};
    const normalizedAmount = parsePositiveMoneyAmount(amount);
    if (!normalizedAmount || !date) {
      return { validationMessage: 'مبلغ و تاریخ پرداخت الزامی است.' };
    }

    const isoDate = normalizeInstallmentCashPaymentDate(date);
    if (!isoDate) {
      return { validationMessage: 'فرمت تاریخ نامعتبر است.' };
    }

    const saleIdForFinal = await installmentsRepo.getInstallmentPaymentSaleId(paymentId);
    let unpaidBefore = 0;
    if (saleIdForFinal) {
      unpaidBefore = await installmentsRepo.countUnpaidInstallmentPayments(saleIdForFinal);
    }

    const x = await installmentsRepo.addInstallmentTransaction(
      paymentId,
      normalizedAmount,
      isoDate,
      notes,
    );

    try {
      if (notifyCustomer) {
        await notifyCustomer('INSTALLMENT_PAYMENT_RECEIVED', paymentId, 'both', {
          amount: normalizedAmount,
        });
      }
    } catch (notifyErr) {
      console.warn('installment payment notify failed:', notifyErr);
    }

    let sms: any = undefined;
    let finalizedNow = false;
    let smsAttempted = false;
    let smsSuccess = false;
    let smsError: string | undefined = undefined;

    try {
      if (saleIdForFinal && unpaidBefore > 0) {
        const unpaidAfter = await installmentsRepo.countUnpaidInstallmentPayments(saleIdForFinal);
        if (unpaidAfter === 0) {
          finalizedNow = true;
          try {
            if (notifyCustomer) await notifyCustomer('INSTALLMENT_SETTLED', Number(saleIdForFinal), 'both');
          } catch {}

          const settings = await getAllSettingsAsObject();
          const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();
          const s = await getInstallmentSaleDetailsForSms(saleIdForFinal);
          if (s?.customerPhoneNumber) {
            const recipientNumber = s.customerPhoneNumber;
            const tokens = [
              s.customerFullName,
              String(s.saleId),
              formatPriceForSms(s.totalPrice),
            ];
            const meliBodyId =
              settings.meli_payamak_installment_settlement_pattern_id ||
              settings.meli_payamak_installment_completed_pattern_id
                ? Number(
                    settings.meli_payamak_installment_settlement_pattern_id ||
                      settings.meli_payamak_installment_completed_pattern_id,
                  )
                : undefined;
            const kavenegarTemplate = settings.kavenegar_installment_completed_template;
            const smsIrTemplateId = settings.sms_ir_installment_completed_template_id
              ? Number(settings.sms_ir_installment_completed_template_id)
              : undefined;
            const ippanelPatternCode = settings.ippanel_installment_completed_pattern_code;
            const telegramTemplate = settings.telegram_installment_completed_message;

            switch (provider) {
              case 'meli_payamak': {
                const username = settings.meli_payamak_username;
                const password = settings.meli_payamak_password;
                if (username && password && meliBodyId) {
                  smsAttempted = true;
                  sms = await sendMeliPayamakPatternSms(
                    recipientNumber,
                    meliBodyId,
                    tokens,
                    username,
                    password,
                  );
                  smsSuccess = !!sms?.success;
                }
                break;
              }
              case 'kavenegar': {
                const apiKey = settings.kavenegar_api_key;
                if (apiKey && kavenegarTemplate) {
                  smsAttempted = true;
                  sms = await sendKavenegarPatternSms(
                    recipientNumber,
                    kavenegarTemplate,
                    tokens,
                    apiKey,
                  );
                  smsSuccess = !!sms?.success;
                }
                break;
              }
              case 'sms_ir': {
                const apiKey = settings.sms_ir_api_key;
                if (apiKey && smsIrTemplateId) {
                  smsAttempted = true;
                  sms = await sendSmsIrPatternSms(
                    recipientNumber,
                    smsIrTemplateId,
                    tokens,
                    apiKey,
                  );
                  smsSuccess = !!sms?.success;
                }
                break;
              }
              case 'ippanel': {
                const tokenAuth = settings.ippanel_token || settings.ippanel_api_key;
                const fromNumber = settings.ippanel_from_number || settings.ippanel_from || settings.ippanel_sender;
                if (tokenAuth && fromNumber && ippanelPatternCode) {
                  smsAttempted = true;
                  sms = await sendIppanelPatternSms(
                    recipientNumber,
                    ippanelPatternCode,
                    tokens,
                    tokenAuth,
                    fromNumber,
                  );
                  smsSuccess = !!sms?.success;
                }
                break;
              }
              case 'telegram': {
                setTelegramProxy((settings as any).telegram_proxy);
                const botToken = settings.telegram_bot_token;
                const chatId = settings.telegram_chat_id;
                if (botToken && chatId && telegramTemplate) {
                  smsAttempted = true;
                  const values: Record<string, string> = {
                    name: tokens[0] ?? '',
                    saleId: tokens[1] ?? '',
                    total: tokens[2] ?? '',
                    amount: tokens[2] ?? '',
                  };
                  const text = sanitizeTelegramHtml(
                    renderTplHtml(markdownishToHtml(String(telegramTemplate)), values),
                  );
                  sms = await sendTelegramMessage(botToken, chatId, text, {
                    parseMode: 'HTML',
                  });
                  smsSuccess = !!(sms && (sms as any).success !== false);
                }
                break;
              }
              default:
                break;
            }
          }
        }
      }
    } catch (err) {
      smsError = err && (err as any).message ? String((err as any).message) : 'SMS_FAILED';
      console.error('Failed to auto-send INSTALLMENT_COMPLETED SMS:', err);
    }

    if (smsAttempted && saleIdForFinal && insertSmsLog) {
      await insertSmsLog({
        reqUser,
        provider: String((await getAllSettingsAsObject()).sms_provider || 'meli_payamak').toLowerCase(),
        eventType: 'INSTALLMENT_COMPLETED',
        entityType: 'installment',
        entityId: Number(saleIdForFinal),
        recipient:
          sms && (sms as any).to
            ? String((sms as any).to)
            : (await getInstallmentSaleDetailsForSms(saleIdForFinal))?.customerPhoneNumber || '',
        patternId: undefined,
        tokens: undefined,
        success: !!(sms && (sms as any).success),
        response: sms,
        error: smsError,
      });
    }

    return {
      data: x,
      finalizedNow,
      smsAttempted,
      smsSuccess,
      smsError,
      sms,
    };
  },

  updateInstallmentPaymentTransaction: async (txId: number, body: any) => {
    const { amount, date, notes } = body || {};
    const normalizedAmount = parsePositiveMoneyAmount(amount);
    if (!normalizedAmount || !date) {
      return { validationMessage: 'مبلغ و تاریخ پرداخت الزامی است.' };
    }

    const isoDate = normalizeInstallmentCashPaymentDate(date);
    if (!isoDate) {
      return { validationMessage: 'فرمت تاریخ نامعتبر است.' };
    }

    const data = await installmentsRepo.updateInstallmentTransaction(
      txId,
      normalizedAmount,
      isoDate,
      notes,
    );
    return { data };
  },

  deleteInstallmentPaymentTransaction: (txId: number) =>
    installmentsRepo.deleteInstallmentTransaction(txId),
};
