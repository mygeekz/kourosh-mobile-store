import type { Express, RequestHandler } from 'express';
import { formatExactNumberText } from '../../utils/exactNumber';
import {
  addAuditLog,
  addPartToRepairInDb,
  createRepairInDb,
  deletePartFromRepairInDb,
  finalizeRepairInDb,
  getAllRepairsFromDb,
  getAllSettingsAsObject,
  getRepairByIdFromDb,
  getRepairDetailsForSms,
  updateRepairInDb,
} from '../database';
import type { FinalizeRepairPayload, NewRepairData } from '../database';
import {
  sendIppanelPatternSms,
  sendKavenegarPatternSms,
  sendMeliPayamakPatternSms,
  sendSmsIrPatternSms,
} from '../smsService';
import { sendTelegramMessage, setTelegramProxy } from '../telegramService';

type AuthorizeRole = (allowed: string[]) => RequestHandler;
type NotifyCustomer = (
  eventType: string,
  refId: number,
  channels: string,
  extra?: Record<string, any>,
) => Promise<any>;

type RepairsRouteDeps = {
  authorizeRole: AuthorizeRole;
  notifyCustomer?: NotifyCustomer;
};

const REPAIR_ROLES = ['Admin', 'Manager', 'Technician'];

const REPORT_CURRENCY_CONTRACT = {
  currencyBase: 'TOMAN',
  displayCurrency: 'تومان',
  moneyDivisor: 1,
} as const;

const formatPriceForSms = (price: number): string => {
  const n = Number(price || 0);
  const toman = Number.isFinite(n) ? n / REPORT_CURRENCY_CONTRACT.moneyDivisor : 0;
  return formatExactNumberText(toman);
};

const esc = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const telegramCard = (
  title: string,
  icon: string,
  lines: string[],
  footer?: string,
) => {
  const body = (lines || []).filter(Boolean).join('\n');
  return [
    `<b>${icon} ${title}</b>`,
    '────────────',
    body,
    footer ? `\n${footer}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

export const registerRepairsRoutes = (
  app: Express,
  { authorizeRole, notifyCustomer }: RepairsRouteDeps,
): void => {
  app.post(
    '/api/repairs',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        const created = await createRepairInDb(req.body as NewRepairData);
        try {
          if (created?.id && notifyCustomer) {
            await notifyCustomer('REPAIR_RECEIVED_CONFIRMATION', Number(created.id), 'both');
          }
        } catch (notifyErr) {
          console.warn('repair created notify failed:', notifyErr);
        }
        try {
          if (
            created?.id &&
            Number(
              (created as any)?.repair?.estimatedCost ??
                (created as any)?.estimatedCost ??
                0,
            ) > 0 &&
            notifyCustomer
          ) {
            await notifyCustomer('REPAIR_COST_ESTIMATED', Number(created.id), 'both');
          }
        } catch (notifyErr) {
          console.warn('repair estimated notify failed:', notifyErr);
        }
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              'create',
              'repair',
              created?.id || null,
              `ثبت تعمیر #${created?.id ?? ''}`,
            );
          } catch {}
        }
        res.status(201).json({ success: true, data: created });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/repairs',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await getAllRepairsFromDb(req.query.status as string | undefined),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/repairs/:id',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        const details = await getRepairByIdFromDb(+req.params.id);
        details
          ? res.json({ success: true, data: details })
          : res.status(404).json({ success: false, message: 'تعمیر یافت نشد.' });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    '/api/repairs/:id',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        const rid = +req.params.id;
        let beforeStatus: string | undefined;
        try {
          const before = await getRepairByIdFromDb(rid);
          beforeStatus = before?.repair?.status;
        } catch {}
        const updated = await updateRepairInDb(rid, req.body);

        try {
          const afterStatus = (updated as any)?.repair?.status ?? (updated as any)?.status;
          const statusChanged = beforeStatus && afterStatus && beforeStatus !== afterStatus;
          const sendRepairEvent = async (
            eventType: 'REPAIR_RECEIVED' | 'REPAIR_READY_FOR_PICKUP',
          ) => {
            const settings = await getAllSettingsAsObject();
            const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();
            const r = await getRepairDetailsForSms(rid);
            if (!r || !r.customerPhoneNumber) return;

            let tokens: string[] = [];
            let meliBodyId: number | undefined;
            let kavenegarTemplate: string | undefined;
            let smsIrTemplateId: number | undefined;
            let ippanelPatternCode: string | undefined;
            if (eventType === 'REPAIR_RECEIVED') {
              tokens = [r.customerFullName, r.deviceModel, String(r.id)];
              meliBodyId = Number(settings.meli_payamak_repair_received_pattern_id);
              kavenegarTemplate = settings.kavenegar_repair_received_template;
              smsIrTemplateId = settings.sms_ir_repair_received_template_id
                ? Number(settings.sms_ir_repair_received_template_id)
                : undefined;
              ippanelPatternCode = settings.ippanel_repair_received_pattern_code;
            } else {
              if (r.finalCost == null) return;
              tokens = [
                r.customerFullName,
                r.deviceModel,
                formatPriceForSms(r.finalCost),
              ];
              meliBodyId = Number(settings.meli_payamak_repair_ready_pattern_id);
              kavenegarTemplate = settings.kavenegar_repair_ready_template;
              smsIrTemplateId = settings.sms_ir_repair_ready_template_id
                ? Number(settings.sms_ir_repair_ready_template_id)
                : undefined;
              ippanelPatternCode = settings.ippanel_repair_ready_pattern_code;
            }

            if (provider === 'telegram') {
              setTelegramProxy((settings as any).telegram_proxy);
              const botToken = settings.telegram_bot_token;
              const chatId = settings.telegram_chat_id;
              if (!botToken || !chatId) return;
              const msg =
                eventType === 'REPAIR_RECEIVED'
                  ? telegramCard(
                      'پذیرش تعمیر',
                      '✅',
                      [
                        `👤 مشتری: <b>${esc(r.customerFullName)}</b>`,
                        `📱 دستگاه: <b>${esc(r.deviceModel)}</b>`,
                        `🧾 کد تعمیر: <b>#${esc(r.id)}</b>`,
                      ],
                      'وضعیت تعمیر از بخش «تعمیرات» قابل پیگیری است.',
                    )
                  : telegramCard(
                      'آماده تحویل',
                      '📦',
                      [
                        `👤 مشتری: <b>${esc(r.customerFullName)}</b>`,
                        `📱 دستگاه: <b>${esc(r.deviceModel)}</b>`,
                        `💰 هزینه: <b>${esc(formatPriceForSms(r.finalCost))} تومان</b>`,
                        `🧾 کد تعمیر: <b>#${esc(r.id)}</b>`,
                      ],
                      'لطفاً برای تحویل با مشتری هماهنگ شود.',
                    );
              await sendTelegramMessage(botToken, chatId, msg, { parseMode: 'HTML' });
              return;
            }

            if (provider === 'meli_payamak') {
              const username = settings.meli_payamak_username;
              const password = settings.meli_payamak_password;
              if (!username || !password || !meliBodyId) return;
              await sendMeliPayamakPatternSms(
                r.customerPhoneNumber,
                meliBodyId,
                tokens,
                username,
                password,
              );
              return;
            }
            if (provider === 'kavenegar') {
              const apiKey = settings.kavenegar_api_key;
              if (!apiKey || !kavenegarTemplate) return;
              await sendKavenegarPatternSms(
                r.customerPhoneNumber,
                kavenegarTemplate,
                tokens,
                apiKey,
              );
              return;
            }
            if (provider === 'sms_ir') {
              const apiKey = settings.sms_ir_api_key;
              if (!apiKey || !smsIrTemplateId) return;
              await sendSmsIrPatternSms(
                r.customerPhoneNumber,
                smsIrTemplateId,
                tokens,
                apiKey,
              );
              return;
            }
            if (provider === 'ippanel') {
              const tokenAuth = settings.ippanel_token || settings.ippanel_api_key;
              const fromNumber = settings.ippanel_from_number || settings.ippanel_from || settings.ippanel_sender;
              if (!tokenAuth || !fromNumber || !ippanelPatternCode) return;
              await sendIppanelPatternSms(
                r.customerPhoneNumber,
                ippanelPatternCode,
                tokens,
                tokenAuth,
                fromNumber,
              );
            }
          };

          if (statusChanged) {
            try {
              if (notifyCustomer) {
                await notifyCustomer('REPAIR_STATUS_UPDATED', rid, 'both', {
                  status: afterStatus,
                });
              }
            } catch {}
            if (afterStatus === 'پذیرش شده') {
              await sendRepairEvent('REPAIR_RECEIVED');
            }
            if (afterStatus === 'آماده تحویل') {
              await sendRepairEvent('REPAIR_READY_FOR_PICKUP');
            }
            if (afterStatus === 'تحویل داده شده') {
              try {
                if (notifyCustomer) await notifyCustomer('REPAIR_DELIVERED', rid, 'both');
              } catch {}
            }
          }
        } catch (notifyErr) {
          console.warn('repair auto-notify failed:', notifyErr);
        }

        if (req.user) {
          try {
            const afterStatus = (updated as any)?.repair?.status ?? (updated as any)?.status;
            if (req.body?.status && beforeStatus && afterStatus && beforeStatus !== afterStatus) {
              addAuditLog(
                req.user.id,
                req.user.username,
                req.user.roleName,
                'update',
                'repair',
                rid,
                `تغییر وضعیت تعمیر #${rid}: "${beforeStatus}" → "${afterStatus}"`,
              );
            } else {
              addAuditLog(
                req.user.id,
                req.user.username,
                req.user.roleName,
                'update',
                'repair',
                rid,
                `ویرایش تعمیر #${rid}`,
              );
            }
          } catch {}
        }
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/repairs/:id/finalize',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        const data = await finalizeRepairInDb(
          +req.params.id,
          req.body as FinalizeRepairPayload,
        );
        try {
          if (notifyCustomer) await notifyCustomer('REPAIR_DELIVERED', +req.params.id, 'both');
        } catch {}
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/repairs/:id/parts',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        const { productId, quantityUsed } = req.body || {};
        res.status(201).json({
          success: true,
          data: await addPartToRepairInDb(+req.params.id, productId, quantityUsed),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    '/api/repairs/:id/parts/:partId',
    authorizeRole(REPAIR_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: await deletePartFromRepairInDb(+req.params.partId),
          message: 'قطعه با موفقیت حذف شد.',
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
