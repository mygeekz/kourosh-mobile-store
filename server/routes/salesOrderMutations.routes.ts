import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import type { InvoiceData, SalesOrderPayload } from '../../types';
import type { CustomerSalesTrustProfile } from '../utils/salesAdvisorHelpers';
import { addAuditLog, getAllSettingsAsObject } from '../database';
import { validateSalesOrderPayload } from '../validators';
import {
  actorFromRequestUser,
  buildSalesOrderImpact,
  consumeSensitiveAccountingOperation,
  prepareSensitiveAccountingOperation,
  recordSensitiveAccountingMutation,
} from '../accounting/sensitiveAccountingOperations';
import {
  buildSalesOrderCreatedTelegramText,
  buildSalesOrderCancelledTelegramText,
  buildSalesOrderReturnCreatedTelegramText,
  cancelSalesOrderWithReason,
  createSalesOrderFromPayload,
  createSalesReturnForOrder,
  enforceSalesOrderCreditLimitGuard,
  fetchSalesOrderInvoiceForNotification,
  removeSalesOrder,
} from '../services/salesOrderMutations.service';

type AuthorizeRole = (roles: string[]) => RequestHandler;

const toUnknownRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export type SalesOrderMutationRoutesDeps = {
  authorizeRole: AuthorizeRole;
  getCustomerById: (customerId: number) => Promise<unknown>;
  getCustomerSalesTrustProfile: (
    customerId: number,
    customer: unknown,
  ) => Promise<CustomerSalesTrustProfile | null>;
  toNumber: (value: unknown) => number;
  formatPriceForSms: (price: number) => string;
  notifyCustomer: (
    eventType: string,
    entityId: number,
    channels?: string,
    extra?: Record<string, unknown>,
  ) => Promise<unknown>;
  safeReplaceTemplate: (
    template: string,
    vars: Record<string, unknown>,
  ) => string;
  enqueueTelegramToTopicTargets: (
    topic: string,
    typeKey: string,
    text: string,
    meta?: Record<string, unknown>,
  ) => Promise<unknown>;
};

export function registerSalesOrderMutationRoutes(
  app: Express,
  deps: SalesOrderMutationRoutesDeps,
) {
  const {
    authorizeRole,
    safeReplaceTemplate,
    enqueueTelegramToTopicTargets,
    getCustomerById,
    getCustomerSalesTrustProfile,
    toNumber,
    formatPriceForSms,
    notifyCustomer,
  } = deps;

  /** ثبت سفارش جدید (فاکتور جدید) */
  app.post(
    '/api/sales-orders',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rawPayload: unknown = req.body;
        const errors = validateSalesOrderPayload(rawPayload);
        if (errors.length) {
          return res
            .status(400)
            .json({ success: false, message: errors.join(' ') });
        }
        const payload = rawPayload as SalesOrderPayload;

        // Guardrail: credit sales above the suggested customer credit limit require Manager/Admin authority.
        const guard = await enforceSalesOrderCreditLimitGuard({
          payload,
          roleName: req.user?.roleName ?? '',
          getCustomerById,
          getCustomerSalesTrustProfile,
          toNumber,
        });
        if (!guard.allowed) {
          return res.status(403).json({
            success: false,
            message:
              'این فروش از سقف اعتبار پیشنهادی مشتری عبور کرده و نیازمند تأیید مدیر است.',
            data: guard.data,
          });
        }

        const result = await createSalesOrderFromPayload(payload);
        const orderId = result.orderId;

        // Internal Telegram notification (sales topic) - template-based
        try {
          const who = req.user?.username?.trim() || 'admin';
          let invoice: InvoiceData | null = null;
          try {
            invoice = await fetchSalesOrderInvoiceForNotification(orderId);
          } catch {}
          const settings = await getAllSettingsAsObject();
          const text = buildSalesOrderCreatedTelegramText({
            orderId,
            payload,
            invoice,
            username: who,
            settings,
            safeReplaceTemplate,
            formatPriceForSms,
          });
          await enqueueTelegramToTopicTargets(
            'sales',
            'SALES_ORDER_CREATED',
            text,
            { entityType: 'sales_order', entityId: orderId || undefined },
          );
        } catch {}

        try {
          await notifyCustomer('INVOICE_CREATED', orderId, 'both');
        } catch {}

        // Audit: create sales order
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              'create',
              'sales_order',
              orderId,
              `ثبت فاکتور فروش #${orderId}`,
            );
          } catch {}
        }
        return res.status(201).json({
          success: true,
          message: 'سفارش با موفقیت ثبت شد.',
          data: result,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error || '');
        const businessFailure =
          /سبد خرید خالی|فروش اعتباری.*مشتری|برای فروش موجود نیست|موجودی کالای|موجودی را تازه|دوره حسابداری.*بسته است/.test(message);
        if (businessFailure) {
          return res.status(409).json({ success: false, message });
        }
        next(error);
      }
    },
  );

  app.post(
    '/api/sales-orders/:id/delete/prepare',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'شناسه نامعتبر است.' });
        const reason = String(req.body?.reason || '').trim();
        if (!reason) return res.status(400).json({ success: false, message: 'دلیل درخواست حذف الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        const impact = await buildSalesOrderImpact(id, 'delete');
        const data = prepareSensitiveAccountingOperation({ action: 'sales_order_delete', scopeKey: `sales-order:${id}`, actor, payload: { reason }, impact });
        return res.json({ success: true, data });
      } catch (error) { next(error); }
    },
  );

  app.post(
    '/api/sales-orders/:id/cancel/prepare',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'شناسه نامعتبر است.' });
        const reason = String(req.body?.reason || req.body?.cancelReason || '').trim();
        if (!reason) return res.status(400).json({ success: false, message: 'ثبت دلیل ابطال فاکتور الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        const impact = await buildSalesOrderImpact(id, 'cancel');
        const data = prepareSensitiveAccountingOperation({ action: 'sales_order_cancel', scopeKey: `sales-order:${id}`, actor, payload: { reason }, impact });
        return res.json({ success: true, data });
      } catch (error) { next(error); }
    },
  );

  /** حذف فاکتور + برگشت موجودی + اصلاح دفتر مشتری */
  app.delete(
    '/api/sales-orders/:id',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (Number.isNaN(id))
          return res
            .status(400)
            .json({ success: false, message: 'شناسه نامعتبر است.' });
        const reason = String(req.body?.reason || '').trim();
        if (!reason) return res.status(400).json({ success: false, message: 'دلیل درخواست حذف الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        consumeSensitiveAccountingOperation({ token: req.body?.confirmationToken, action: 'sales_order_delete', scopeKey: `sales-order:${id}`, actor, payload: { reason } });
        const beforeImpact = await buildSalesOrderImpact(id, 'delete');
        const result = await removeSalesOrder(id, reason);
        if (!result)
          return res
            .status(404)
            .json({ success: false, message: 'فاکتور یافت نشد.' });
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              'delete',
              'sales_order',
              id,
              `حذف فاکتور فروش #${id}`,
            );
          } catch {}
        }
        await recordSensitiveAccountingMutation({ action: 'sales_order_delete', entityType: 'sales_order', entityId: id, actor, reason, before: beforeImpact, after: { preserved: true, status: 'canceled' } });
        res.json({ success: true, message: 'فاکتور به‌صورت غیرمخرب باطل شد و تاریخچه آن حفظ شد.', data: result });
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  // P0: Cancel invoice (soft-cancel) + Returns
  app.post(
    '/api/sales-orders/:id/cancel',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orderId = Number(req.params.id);
        if (!orderId)
          return res.status(400).json({
            success: false,
            message: 'شناسه فاکتور نامعتبر است.',
          });
        const body = toUnknownRecord(req.body);
        const cancelReason = String(
          body?.reason ?? body?.cancelReason ?? '',
        ).trim();
        if (!cancelReason) {
          return res.status(400).json({ success: false, message: 'ثبت دلیل ابطال فاکتور الزامی است.' });
        }
        const actor = actorFromRequestUser(req.user);
        consumeSensitiveAccountingOperation({ token: body?.confirmationToken, action: 'sales_order_cancel', scopeKey: `sales-order:${orderId}`, actor, payload: { reason: cancelReason } });
        const beforeImpact = await buildSalesOrderImpact(orderId, 'cancel');
        const result = await cancelSalesOrderWithReason(orderId, cancelReason);
        if (!result)
          return res
            .status(404)
            .json({ success: false, message: 'فاکتور یافت نشد.' });
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              'update',
              'sales_order',
              orderId,
              `ابطال فاکتور فروش #${orderId} | دلیل: ${cancelReason}`,
            );
          } catch {}
        }
        // Internal Telegram notification (sales topic) - template-based
        try {
          const who = String(req.user?.username || '').trim();
          const settings = await getAllSettingsAsObject();
          const text = buildSalesOrderCancelledTelegramText({
            orderId,
            username: who,
            settings,
            safeReplaceTemplate,
          });
          await enqueueTelegramToTopicTargets(
            'sales',
            'SALES_ORDER_CANCELLED',
            text,
            { entityType: 'sales_order', entityId: orderId },
          );
        } catch {}
        await recordSensitiveAccountingMutation({ action: 'sales_order_cancel', entityType: 'sales_order', entityId: orderId, actor, reason: cancelReason, before: beforeImpact, after: { status: 'canceled' } });
        return res.json({ success: true, data: result });
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  app.post(
    '/api/sales-orders/:id/returns',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orderId = Number(req.params.id);
        if (!orderId)
          return res
            .status(400)
            .json({ success: false, message: 'شناسه فاکتور نامعتبر است.' });
        const row = await createSalesReturnForOrder(
          orderId,
          req.body,
          req.user?.id ?? null,
        );
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              'create',
              'sales_return',
              row.id,
              `ثبت مرجوعی برای خرید #${orderId} (مرجوعی #${row.id})`,
            );
          } catch {}
        }
        // Internal Telegram notification (sales topic) - template-based
        try {
          const who = req.user?.username?.trim() || '';
          const settings = await getAllSettingsAsObject();
          const text = buildSalesOrderReturnCreatedTelegramText({
            orderId,
            row,
            username: who,
            settings,
            safeReplaceTemplate,
          });
          await enqueueTelegramToTopicTargets(
            'sales',
            'SALES_ORDER_RETURN_CREATED',
            text,
            {
              entityType: 'sales_return',
              entityId: row.id,
            },
          );
        } catch {}
        return res.json({ success: true, data: row });
      } catch (error: unknown) {
        next(error);
      }
    },
  );

}

// Backward-compatible type aliases for older imports.
export type SalesOrderMutationDeps = SalesOrderMutationRoutesDeps;
