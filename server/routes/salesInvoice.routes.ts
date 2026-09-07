import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import {
  getLegacyInvoiceDataBySaleId,
  getLegacyInvoiceDataForSaleIds,
  getSalesOrderInvoiceWithLegacyFallback,
  getSalesOrderProfitSnapshot,
  listSalesReturnsForOrder,
} from '../services/salesInvoice.service';

type AuthorizeRole = (roles: string[]) => RequestHandler;

export function registerSalesInvoiceRoutes(
  app: Express,
  deps: { authorizeRole: AuthorizeRole },
) {
  const { authorizeRole } = deps;

  app.get(
    '/api/sales-orders/:id/returns',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orderId = Number(req.params.id);
        if (!orderId)
          return res
            .status(400)
            .json({ success: false, message: 'شناسه فاکتور نامعتبر است.' });
        const rows = await listSalesReturnsForOrder(orderId);
        return res.json({ success: true, data: rows });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    '/api/sales-orders/:id',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
          return res
            .status(400)
            .json({ success: false, message: 'شناسه نامعتبر است.' });
        }
        const invoice = await getSalesOrderInvoiceWithLegacyFallback(id);
        if (!invoice) {
          return res
            .status(404)
            .json({ success: false, message: 'فاکتور یافت نشد.' });
        }
        res.json({ success: true, data: invoice });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/sales-orders/:id/profit-snapshot',
    authorizeRole(['Admin', 'Manager']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (Number.isNaN(id) || id <= 0) {
          return res
            .status(400)
            .json({ success: false, message: 'شناسه نامعتبر است.' });
        }
        const data = await getSalesOrderProfitSnapshot(id);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/invoice-data/:saleId(\\d+)',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const saleId = parseInt(req.params.saleId, 10);
        const data = await getLegacyInvoiceDataBySaleId(saleId);
        if (!data)
          return res.status(404).json({
            success: false,
            message: 'فاکتور برای این فروش یافت نشد.',
          });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/api/invoice-data/:saleIds',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ids = String(req.params.saleIds)
          .split(',')
          .map((s) => parseInt(s, 10))
          .filter(Boolean);
        if (!ids.length)
          return res
            .status(400)
            .json({ success: false, message: 'شناسهٔ فروش نامعتبر است.' });
        const data = await getLegacyInvoiceDataForSaleIds(ids);
        if (!data)
          return res.status(404).json({
            success: false,
            message: 'فاکتور برای فروش‌های خواسته‌شده یافت نشد.',
          });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
}
