import { AppError } from '../errors/AppError.js';
import * as purchaseOrderService from '../services/purchaseOrderService.js';

export async function createPurchaseOrder(req, res, next) {
  try { res.status(201).json(await purchaseOrderService.createPurchaseOrder({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body })); }
  catch (error) { next(error); }
}

export async function confirmPurchaseOrder(req, res, next) {
  try { res.json(await purchaseOrderService.confirmPurchaseOrder({ tenantId: req.tenant.id, actorUserId: req.user.id, purchaseOrderId: req.params.id })); }
  catch (error) { next(error); }
}

export async function cancelPurchaseOrder(req, res, next) {
  try { res.json(await purchaseOrderService.cancelPurchaseOrder({ tenantId: req.tenant.id, actorUserId: req.user.id, purchaseOrderId: req.params.id })); }
  catch (error) { next(error); }
}

export async function listPurchaseOrders(req, res, next) {
  try { res.json(await purchaseOrderService.listPurchaseOrders({ tenantId: req.tenant.id, query: req.query })); }
  catch (error) { next(error); }
}

export async function getPurchaseOrder(req, res, next) {
  try {
    const po = await purchaseOrderService.getPurchaseOrder({ tenantId: req.tenant.id, purchaseOrderId: req.params.id });
    if (!po) throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order was not found.');
    res.json(po);
  } catch (error) { next(error); }
}
