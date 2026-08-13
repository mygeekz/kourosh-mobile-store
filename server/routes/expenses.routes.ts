import type { Express, RequestHandler } from 'express';
import { addAuditLog } from '../database';
import { expensesService } from '../services/expenses.service';
import type { ExpenseActor } from '../services/expenses.service';

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ExpensesRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const EXPENSE_ROLES = ['Admin', 'Manager'];

const getExpenseActor = (user: any): ExpenseActor | undefined => {
  if (!user) return undefined;
  return { userId: user.id, username: user.username };
};

const addUserAuditLog = (
  user: any,
  action: string,
  entityType: string,
  entityId: any,
  description: string,
) => {
  if (!user) return;
  try {
    addAuditLog(
      user.id,
      user.username,
      user.roleName,
      action,
      entityType,
      entityId,
      description,
    );
  } catch {}
};

const isBasicExpenseValidationError = (message: string) =>
  message.includes('خالی') || message.includes('نامعتبر');

const isRecurringPaymentValidationError = (message: string) =>
  message.includes('نامعتبر') ||
  message.includes('خالی') ||
  message.includes('غیرفعال') ||
  message.includes('یافت نشد');

export const registerExpensesRoutes = (
  app: Express,
  { authorizeRole }: ExpensesRouteDeps,
): void => {
  app.get(
    '/api/expenses',
    authorizeRole(EXPENSE_ROLES),
    async (req, res, next) => {
      try {
        const from = String(req.query.from || '');
        const to = String(req.query.to || '');
        const category = String(req.query.category || 'all');
        const data = await expensesService.listExpenses({
          from: from || undefined,
          to: to || undefined,
          category,
        });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/expenses',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const data = await expensesService.createExpense(
          req.body,
          getExpenseActor((req as any).user),
        );
        addUserAuditLog(
          (req as any).user,
          'create',
          'expense',
          data?.id,
          'ثبت هزینه',
        );
        res.status(201).json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isBasicExpenseValidationError(msg))
          return res.status(400).json({ success: false, message: msg });
        console.error('POST /api/expenses error', e);
        res
          .status(500)
          .json({ success: false, message: 'Internal Server Error' });
      }
    },
  );

  app.patch(
    '/api/expenses/:id',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const id = +req.params.id;
        const data = await expensesService.updateExpense(id, req.body || {});
        addUserAuditLog(
          (req as any).user,
          'update',
          'expense',
          id,
          'ویرایش هزینه',
        );
        res.json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isBasicExpenseValidationError(msg))
          return res.status(400).json({ success: false, message: msg });
        console.error('PATCH /api/expenses error', e);
        res
          .status(500)
          .json({ success: false, message: 'Internal Server Error' });
      }
    },
  );

  app.delete(
    '/api/expenses/:id',
    authorizeRole(EXPENSE_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        await expensesService.deleteExpense(id);
        addUserAuditLog(
          (req as any).user,
          'delete',
          'expense',
          id,
          'حذف هزینه',
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/reports/expenses-summary',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const from = String(req.query.from || '');
        const to = String(req.query.to || '');
        const data = await expensesService.getExpensesSummary({
          from: from || undefined,
          to: to || undefined,
        });
        res.json({ success: true, data });
      } catch (e) {
        console.error('GET /api/reports/expenses-summary error', e);
        res.status(500).json({
          success: false,
          message: 'خطا در دریافت جمع هزینه‌ها؛ داده ناقص نمایش داده نشد.',
        });
      }
    },
  );

  app.get(
    '/api/expenses/title-options',
    authorizeRole(EXPENSE_ROLES),
    async (_req, res) => {
      try {
        const data = await expensesService.getTitleOptions();
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, data });
      } catch (e) {
        console.error('GET /api/expenses/title-options error', e);
        res.status(500).json({
          success: false,
          message: 'خطا در دریافت پیشنهادهای عنوان هزینه.',
        });
      }
    },
  );

  app.get(
    '/api/expenses/title-history',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const title = String(req.query.title || '').trim();
        if (!title) return res.json({ success: true, data: null });
        const data = await expensesService.getTitleHistory(title);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, data });
      } catch (e) {
        console.error('GET /api/expenses/title-history error', e);
        res.status(500).json({
          success: false,
          message: 'خطا در دریافت سابقه عنوان هزینه.',
        });
      }
    },
  );

  app.get(
    '/api/expenses/dashboard',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const data = await expensesService.getDashboard(req.query);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, data });
      } catch (e) {
        console.error('GET /api/expenses/dashboard error', e);
        res
          .status(500)
          .json({ success: false, message: 'خطا در دریافت داشبورد هزینه‌ها' });
      }
    },
  );

  app.get(
    '/api/recurring-expenses',
    authorizeRole(EXPENSE_ROLES),
    async (_req, res) => {
      try {
        const data = await expensesService.listRecurringExpenses();
        res.json({ success: true, data });
      } catch (e) {
        console.error('GET /api/recurring-expenses error', e);
        res.status(500).json({
          success: false,
          message: 'خطا در دریافت هزینه‌های تکرارشونده؛ داده ناقص نمایش داده نشد.',
        });
      }
    },
  );

  app.post(
    '/api/recurring-expenses',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const data = await expensesService.createRecurringExpense(
          req.body,
          getExpenseActor((req as any).user),
        );
        addUserAuditLog(
          (req as any).user,
          'create',
          'recurring_expense',
          data?.id,
          'ثبت هزینه تکرارشونده',
        );
        res.status(201).json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isBasicExpenseValidationError(msg))
          return res.status(400).json({ success: false, message: msg });
        console.error('POST /api/recurring-expenses error', e);
        res
          .status(500)
          .json({ success: false, message: 'Internal Server Error' });
      }
    },
  );

  app.patch(
    '/api/recurring-expenses/:id',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const id = +req.params.id;
        const data = await expensesService.updateRecurringExpense(
          id,
          req.body || {},
        );
        addUserAuditLog(
          (req as any).user,
          'update',
          'recurring_expense',
          id,
          'ویرایش هزینه تکرارشونده',
        );
        res.json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isBasicExpenseValidationError(msg))
          return res.status(400).json({ success: false, message: msg });
        console.error('PATCH /api/recurring-expenses error', e);
        res
          .status(500)
          .json({ success: false, message: 'Internal Server Error' });
      }
    },
  );

  app.delete(
    '/api/recurring-expenses/:id',
    authorizeRole(EXPENSE_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        await expensesService.deleteRecurringExpense(id);
        addUserAuditLog(
          (req as any).user,
          'delete',
          'recurring_expense',
          id,
          'حذف هزینه تکرارشونده',
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/recurring-expenses/:id/run',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const id = +req.params.id;
        const row: any = await expensesService.getRecurringExpense(id);
        if (!row)
          return res.status(404).json({ success: false, message: 'یافت نشد.' });
        const data = await expensesService.addRecurringExpensePayment(
          id,
          {
            amount: Number(req.body?.amount || row.amount || 0),
            paymentDate: String(req.body?.paymentDate || row.nextRunDate || ''),
            paymentMethod: req.body?.paymentMethod || 'cash',
            referenceNo: req.body?.referenceNo ?? null,
            notes: req.body?.notes ?? null,
          },
          getExpenseActor((req as any).user),
        );
        addUserAuditLog(
          (req as any).user,
          'create',
          'expense',
          data?.createdExpense?.id,
          `ثبت پرداخت هزینه تکرارشونده #${id}`,
        );
        res.json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isRecurringPaymentValidationError(msg)) {
          return res.status(400).json({ success: false, message: msg });
        }
        console.error('POST /api/recurring-expenses/:id/run error', e);
        res
          .status(500)
          .json({ success: false, message: 'Internal Server Error' });
      }
    },
  );

  app.post(
    '/api/recurring-expenses/:id/payment',
    authorizeRole(EXPENSE_ROLES),
    async (req, res) => {
      try {
        const id = +req.params.id;
        const data = await expensesService.addRecurringExpensePayment(
          id,
          {
            amount: Number(req.body?.amount || 0),
            paymentDate: String(req.body?.paymentDate || ''),
            paymentMethod: req.body?.paymentMethod || 'cash',
            referenceNo: req.body?.referenceNo ?? null,
            notes: req.body?.notes ?? null,
          },
          getExpenseActor((req as any).user),
        );
        addUserAuditLog(
          (req as any).user,
          'create',
          'expense',
          data?.createdExpense?.id,
          `ثبت پرداخت هزینه تکرارشونده #${id}`,
        );
        res.json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isRecurringPaymentValidationError(msg)) {
          return res.status(400).json({ success: false, message: msg });
        }
        console.error('POST /api/recurring-expenses/:id/payment error', e);
        res
          .status(500)
          .json({ success: false, message: 'Internal Server Error' });
      }
    },
  );
};
