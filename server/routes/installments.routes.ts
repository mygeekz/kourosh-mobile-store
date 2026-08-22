import type { Express, RequestHandler } from 'express';
import { installmentsService } from '../services/installments.service';

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type NotifyCustomer = (
  eventType: string,
  refId: number,
  channels: string,
  extra?: Record<string, any>,
) => Promise<any>;

type InsertSmsLog = (payload: any) => Promise<any>;

type InstallmentsRouteDeps = {
  authorizeRole: AuthorizeRole;
  notifyCustomer?: NotifyCustomer;
  insertSmsLog?: InsertSmsLog;
};

const INSTALLMENT_ROLES = ['Admin', 'Manager', 'Salesperson'];

export const registerInstallmentsRoutes = (
  app: Express,
  { authorizeRole, notifyCustomer, insertSmsLog }: InstallmentsRouteDeps,
): void => {
  app.post(
    '/api/installment-sales',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res) => {
      try {
        const result = await installmentsService.createInstallmentSale({
          payload: req.body,
          user: req.user,
          notifyCustomer,
        });

        if ('validationMessage' in result) {
          return res
            .status(400)
            .json({ success: false, message: result.validationMessage });
        }

        res.status(201).json({ success: true, data: result.data });
      } catch (e: any) {
        console.error('POST /api/installment-sales failed:', e?.message || e);
        return res.status(500).json({
          success: false,
          message: e?.message || 'خطا در ثبت فروش اقساطی.',
        });
      }
    },
  );

  app.post(
    '/api/installment-sales/payment/:paymentId/transaction',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const result = await installmentsService.recordInstallmentPaymentTransaction({
          paymentId: +req.params.paymentId,
          body: req.body,
          reqUser: req.user,
          notifyCustomer,
          insertSmsLog,
        });

        if ('validationMessage' in result) {
          return res
            .status(400)
            .json({ success: false, message: result.validationMessage });
        }

        res.status(201).json({
          success: true,
          data: result.data,
          message: 'پرداخت با موفقیت ثبت شد.',
          finalizedNow: result.finalizedNow,
          smsAttempted: result.smsAttempted,
          smsSuccess: result.smsSuccess,
          smsError: result.smsError,
          sms: result.sms,
        });
      } catch (e) {
        next(e);
      }
    },
  );

  // ویرایش پرداخت جزئی
  app.put(
    '/api/installment-sales/payment/transaction/:txId',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const result = await installmentsService.updateInstallmentPaymentTransaction(
          +req.params.txId,
          req.body,
        );

        if ('validationMessage' in result) {
          return res
            .status(400)
            .json({ success: false, message: result.validationMessage });
        }

        res.json({ success: true, data: result.data, message: 'پرداخت ویرایش شد.' });
      } catch (e) {
        next(e);
      }
    },
  );

  // حذف پرداخت جزئی
  app.delete(
    '/api/installment-sales/payment/transaction/:txId',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const ok = await installmentsService.deleteInstallmentPaymentTransaction(
          +req.params.txId,
        );
        res.json({
          success: ok,
          message: ok ? 'پرداخت حذف شد.' : 'حذفی انجام نشد.',
        });
      } catch (e) {
        next(e);
      }
    },
  );


  app.post(
    '/api/installment-sales/check/:id/cash-payment',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const result = await installmentsService.addCheckRecoveryPayment(
          +req.params.id,
          req.body,
        );

        if ('validationMessage' in result) {
          return res
            .status(400)
            .json({ success: false, message: result.validationMessage });
        }

        res.status(201).json({
          success: true,
          data: result.data,
          message: 'دریافت نقدی بابت چک با موفقیت ثبت شد.',
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    '/api/installment-sales/check/:id',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const result = await installmentsService.updateInstallmentCheckStatus(
          +req.params.id,
          req.body?.status,
          notifyCustomer,
          {
            checkNumber: req.body?.checkNumber,
            bankName: req.body?.bankName,
            ownershipType: req.body?.ownershipType,
            issuerName: req.body?.issuerName,
            issuerNationalCode: req.body?.issuerNationalCode,
            sayadiId: req.body?.sayadiId,
            dueDate: req.body?.dueDate,
          },
        );

        if ('validationMessage' in result) {
          return res
            .status(400)
            .json({ success: false, message: result.validationMessage });
        }

        res.json({ success: result.ok, message: 'وضعیت چک تازه‌سازی شد.' });
      } catch (e) {
        next(e);
      }
    },
  );

  // وضعیت قسط فقط از روی تراکنش‌های واقعی مشتق می‌شود؛ تغییر دستی status می‌تواند دفتر مشتری را ناسازگار کند.
  app.put(
    '/api/installment-sales/payment/:id',
    authorizeRole(INSTALLMENT_ROLES),
    async (_req, res) => {
      return res.status(400).json({
        success: false,
        message: 'برای تغییر وضعیت قسط، پرداخت را از مسیر ثبت/ویرایش/حذف تراکنش انجام دهید.',
      });
    },
  );

  // قرارداد نهایی اقساطی Hard Delete نمی‌شود. فسخ باید non-destructive و قابل حسابرسی باشد.
  app.post(
    '/api/installment-sales/:id/cancellation/preview',
    authorizeRole(['Admin']),
    async (req, res, next) => {
      try {
        const mode = req.body?.mode === 'full_reversal' ? 'full_reversal' : 'review_required';
        const data = await installmentsService.getInstallmentCancellationPreview(+req.params.id, mode);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/installment-sales/:id/cancel',
    authorizeRole(['Admin']),
    async (req, res, next) => {
      try {
        const result = await installmentsService.cancelInstallmentSale({
          saleId: +req.params.id,
          body: req.body,
          user: req.user,
        });
        if ('validationMessage' in result) {
          return res.status(400).json({ success: false, message: result.validationMessage });
        }
        res.json({
          success: true,
          data: result.data,
          message: result.data?.reconciliationNeeded
            ? 'قرارداد فسخ شد؛ پرونده مالی برای تطبیق انسانی باز مانده است.'
            : (result.data?.expectedRefundDue ?? 0) > 0
              ? 'قرارداد فسخ شد؛ مبلغ قابل استرداد به مشتری ثبت شد.'
              : 'قرارداد با موفقیت فسخ شد.',
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/installment-sales/:id/cancellation/refunds',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const data = await installmentsService.getInstallmentCancellationRefundState(+req.params.id);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/installment-sales/:id/cancellation/refunds',
    authorizeRole(['Admin']),
    async (req, res, next) => {
      try {
        const result = await installmentsService.addInstallmentCancellationRefund({
          saleId: +req.params.id,
          body: req.body,
          user: req.user,
        });
        if ('validationMessage' in result) {
          return res.status(400).json({ success: false, message: result.validationMessage });
        }
        res.json({
          success: true,
          data: result.data,
          message: result.data?.remainingRefund > 0
            ? 'بازپرداخت جزئی ثبت شد و مانده قابل استرداد به‌روزرسانی شد.'
            : result.data?.settlementStatus === 'needs_reconciliation'
              ? 'بازپرداخت کامل شد؛ پرونده فسخ همچنان نیازمند تطبیق مالی است.'
              : 'بازپرداخت کامل شد و تسویه فسخ نهایی شد.',
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    '/api/installment-sales/:id',
    authorizeRole(['Admin']),
    async (_req, res) => {
      return res.status(409).json({
        success: false,
        message: 'قرارداد نهایی اقساطی حذف نمی‌شود. برای حفظ تاریخچه مالی از «فسخ قرارداد» استفاده کنید.',
      });
    },
  );

  app.get(
    '/api/installment-sales',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        // Backward compatibility is intentional: existing callers that do not opt
        // into the directory view still receive the historical array response.
        if (String(req.query?.view || '') === 'directory') {
          const data = await installmentsService.listInstallmentSalesDirectory({
            page: Number(req.query?.page || 1),
            pageSize: Number(req.query?.pageSize || 30),
            search: String(req.query?.search || ''),
            status: String(req.query?.status || '') as any,
            risk: String(req.query?.risk || '') as any,
            sort: String(req.query?.sort || 'latest') as any,
            includeSummary: String(req.query?.includeSummary || '') === '1',
          });
          return res.json({ success: true, data });
        }

        res.json({
          success: true,
          data: await installmentsService.listInstallmentSales(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/installment-sales/customer-due-overview',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        res.setHeader('Cache-Control', 'no-store');
        const customerIds = String(req.query.customerIds || '')
          .split(',')
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
          .slice(0, 100);
        res.json({
          success: true,
          data: await installmentsService.listInstallmentCustomerDueOverview(customerIds),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/installment-sales/customer/:customerId',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const customerId = Number(req.params.customerId);
        if (!Number.isInteger(customerId) || customerId <= 0) {
          return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
        }
        res.setHeader('Cache-Control', 'no-store');
        res.json({
          success: true,
          data: await installmentsService.listInstallmentSalesForCustomer(customerId),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/installment-sales/:id/contract/prepare',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const result = await installmentsService.prepareInstallmentSaleContractForPrint(+req.params.id);
        if ('validationMessage' in result) {
          return res.status(400).json({ success: false, message: result.validationMessage });
        }
        if ('notFound' in result) {
          return res.status(404).json({ success: false, message: 'فروش اقساطی یافت نشد.' });
        }
        return res.json({ success: true, data: result.data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/installment-sales/:id',
    authorizeRole(INSTALLMENT_ROLES),
    async (req, res, next) => {
      try {
        const d = await installmentsService.getInstallmentSaleById(+req.params.id);
        d
          ? res.json({ success: true, data: d })
          : res
              .status(404)
              .json({ success: false, message: 'فروش اقساطی یافت نشد.' });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/installment-sales/:id/profit-snapshot',
    authorizeRole(['Admin', 'Manager']),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        if (!id)
          return res
            .status(400)
            .json({ success: false, message: 'شناسه فروش نامعتبر است.' });
        const data = await installmentsService.getInstallmentSaleProfitSnapshot(id);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
};
