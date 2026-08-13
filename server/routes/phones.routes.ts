import type { Express, RequestHandler } from 'express';
import { phonesService } from '../services/phones.service';
import type {
  PhoneBulkPurchasePayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
} from '../services/phones.service';

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type PhonesRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const PHONE_ROLES = ['Admin', 'Manager', 'Warehouse'];

const getPhoneActor = (user: any): PhoneHistoryActor | undefined => {
  if (!user) return undefined;
  return {
    userId: user.id,
    username: user.username,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.username,
  };
};

const parseDaysFilter = (query: any) => ({
  days: query.days ? parseInt(String(query.days), 10) : 30,
  startDate: query.startDate ? String(query.startDate) : undefined,
  endDate: query.endDate ? String(query.endDate) : undefined,
});

export const registerPhonesRoutes = (
  app: Express,
  { authorizeRole }: PhonesRouteDeps,
): void => {
  app.post(
    '/api/phones',
    authorizeRole(PHONE_ROLES),
    async (req, res, next) => {
      try {
        const payload = req.body as PhoneEntryPayload;
        if (!payload.imei || !payload.model || payload.purchasePrice == null) {
          return res.status(400).json({
            success: false,
            message: 'فیلدهای مدل، IMEI و قیمت خرید الزامی هستند.',
          });
        }
        res.status(201).json({
          success: true,
          data: await phonesService.createPhone(payload, getPhoneActor((req as any).user)),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    '/api/phones/bulk-purchase',
    authorizeRole(PHONE_ROLES),
    async (req, res, next) => {
      try {
        const rawSupplierId = Number(req.body?.supplierId);
        const purchaseDate = String(req.body?.purchaseDate || '').trim();
        const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

        if (!Number.isInteger(rawSupplierId) || rawSupplierId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'انتخاب تامین‌کننده برای فاکتور خرید الزامی است.',
          });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
          return res.status(400).json({
            success: false,
            message: 'تاریخ خرید معتبر برای همه ردیف‌ها الزامی است.',
          });
        }
        if (rawItems.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'حداقل یک گوشی باید در فاکتور خرید ثبت شود.',
          });
        }
        if (rawItems.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'در هر ثبت گروهی حداکثر ۱۰۰ گوشی قابل ثبت است.',
          });
        }

        const rowErrors: Array<{ row: number; field: string; message: string }> = [];
        const normalizedItems: Array<{ model: string; color: string; storage: string; ram: string; imei: string; purchasePrice: number }> = rawItems.map((item: any, index: number) => {
          const model = String(item?.model || '').trim();
          const color = String(item?.color || '').trim();
          const storage = String(item?.storage || '').trim();
          const ram = String(item?.ram || '').trim();
          const imei = String(item?.imei || '').trim();
          const purchasePrice = Number(item?.purchasePrice);

          if (!model) rowErrors.push({ row: index + 1, field: 'model', message: 'مدل الزامی است.' });
          if (!color) rowErrors.push({ row: index + 1, field: 'color', message: 'رنگ الزامی است.' });
          if (!storage) rowErrors.push({ row: index + 1, field: 'storage', message: 'حافظه الزامی است.' });
          if (!ram) rowErrors.push({ row: index + 1, field: 'ram', message: 'رم الزامی است.' });
          if (!/^\d{15,16}$/.test(imei)) rowErrors.push({ row: index + 1, field: 'imei', message: 'IMEI باید ۱۵ یا ۱۶ رقم باشد.' });
          if (!Number.isFinite(purchasePrice) || purchasePrice < 0) rowErrors.push({ row: index + 1, field: 'purchasePrice', message: 'قیمت خرید باید عددی غیرمنفی باشد.' });

          return { model, color, storage, ram, imei, purchasePrice };
        });

        const imeiRows = new Map<string, number[]>();
        normalizedItems.forEach((item, index) => {
          const rows = imeiRows.get(item.imei) || [];
          rows.push(index + 1);
          imeiRows.set(item.imei, rows);
        });
        for (const [imei, rows] of imeiRows.entries()) {
          if (imei && rows.length > 1) {
            rows.forEach((row) => rowErrors.push({ row, field: 'imei', message: `IMEI در ردیف‌های ${rows.join('، ')} تکراری است.` }));
          }
        }

        if (rowErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'اطلاعات بعضی ردیف‌های فاکتور خرید کامل یا معتبر نیست.',
            errors: rowErrors,
          });
        }

        const payload: PhoneBulkPurchasePayload = {
          supplierId: rawSupplierId,
          purchaseDate,
          items: normalizedItems,
        };
        const data = await phonesService.createPhoneBulkPurchase(
          payload,
          getPhoneActor((req as any).user),
        );
        return res.status(201).json({
          success: true,
          data,
          message: `${data.count} گوشی با یک فاکتور خرید وارد موجودی شد.`,
        });
      } catch (error: any) {
        const message = String(error?.message || 'ثبت گروهی خرید گوشی انجام نشد.');
        if (/IMEI|تامین‌کننده/.test(message)) {
          return res.status(/IMEI/.test(message) ? 409 : 400).json({
            success: false,
            message,
          });
        }
        next(error);
      }
    },
  );

  app.get('/api/phones', async (req, res, next) => {
    try {
      const phoneId = req.query.id ? parseInt(String(req.query.id), 10) : undefined;
      res.json({
        success: true,
        data: await phonesService.listPhones({
          status: req.query.status as string,
          phoneId,
          q: req.query.q ? String(req.query.q) : undefined,
          limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
          offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
        }),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/phones/history-report', async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await phonesService.getHistoryReport(parseDaysFilter(req.query)),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/phones/history-analytics', async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await phonesService.getHistoryAnalytics(parseDaysFilter(req.query)),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/phones/dashboard-report', async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await phonesService.getDashboardReport(parseDaysFilter(req.query)),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/phones/history-explorer', async (req, res, next) => {
    try {
      const baseFilters = parseDaysFilter(req.query);
      res.json({
        success: true,
        data: await phonesService.searchHistoryEvents({
          ...baseFilters,
          q: req.query.q ? String(req.query.q) : '',
          eventClass: req.query.eventClass ? String(req.query.eventClass) : 'all',
          model: req.query.model ? String(req.query.model) : 'all',
          limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 120,
        }),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/phones/:id/history', async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await phonesService.listPhoneHistory(+req.params.id),
      });
    } catch (e) {
      next(e);
    }
  });

  app.put(
    '/api/phones/:id',
    authorizeRole(PHONE_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await phonesService.updatePhone(
            +req.params.id,
            req.body as PhoneEntryUpdatePayload,
            getPhoneActor((req as any).user),
          ),
          message: 'گوشی با موفقیت ویرایش شد.',
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    '/api/phones/:id',
    authorizeRole(PHONE_ROLES),
    async (req, res, next) => {
      try {
        const ok = await phonesService.deletePhone(+req.params.id, getPhoneActor((req as any).user));
        ok
          ? res.json({ success: true, message: 'گوشی با موفقیت حذف شد.' })
          : res
              .status(404)
              .json({ success: false, message: 'گوشی برای حذف یافت نشد.' });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get('/api/phone-models', async (_req, res, next) => {
    try {
      res.json({ success: true, data: await phonesService.listModels() });
    } catch (e) {
      next(e);
    }
  });

  app.post(
    '/api/phone-models',
    authorizeRole(PHONE_ROLES),
    async (req, res, next) => {
      try {
        const name = String(req.body?.name || '').trim();
        if (!name) {
          return res
            .status(400)
            .json({ success: false, message: 'نام مدل الزامی است.' });
        }
        const data = await phonesService.createModel(name);
        res.status(201).json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get('/api/phone-colors', async (_req, res, next) => {
    try {
      res.json({ success: true, data: await phonesService.listColors() });
    } catch (e) {
      next(e);
    }
  });

  app.post(
    '/api/phone-colors',
    authorizeRole(PHONE_ROLES),
    async (req, res, next) => {
      try {
        const name = String(req.body?.name || '').trim();
        if (!name) {
          return res
            .status(400)
            .json({ success: false, message: 'نام رنگ الزامی است.' });
        }
        const data = await phonesService.createColor(name);
        res.status(201).json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
};
