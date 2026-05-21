import { AppError } from '../errors/AppError.js';
import * as saleService from '../services/saleService.js';

export async function listSales(req, res, next) {
  try {
    res.json(await saleService.listSales({ tenantId: req.tenant.id, query: req.query }));
  } catch (error) { next(error); }
}

export async function getSale(req, res, next) {
  try {
    const sale = await saleService.getSale({ tenantId: req.tenant.id, saleId: req.params.id });
    if (!sale) throw new AppError(404, 'SALE_NOT_FOUND', 'Sale was not found.');
    res.json(sale);
  } catch (error) { next(error); }
}
