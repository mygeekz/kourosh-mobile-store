import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { listSellableItems, listSalesRows } from '../services/salesRead.service';

type AuthorizeRole = (roles: string[]) => RequestHandler;

export function registerSalesReadRoutes(
  app: Express,
  deps: { authorizeRole: AuthorizeRole },
) {
  const { authorizeRole } = deps;

  app.get('/api/sellable-items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q ? String(req.query.q) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;
      res.json({ success: true, data: await listSellableItems({ q, limit, offset }) });
    } catch (e) {
      next(e);
    }
  });

  const listSalesHandler = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      res.json({ success: true, data: await listSalesRows() });
    } catch (e) {
      next(e);
    }
  };

  app.get(
    '/api/sales-orders',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    listSalesHandler,
  );
  app.get(
    '/api/sales',
    authorizeRole(['Admin', 'Manager', 'Salesperson']),
    listSalesHandler,
  );
}
