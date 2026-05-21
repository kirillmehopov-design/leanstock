import * as transferService from '../services/transferService.js';

export async function createTransfer(req, res, next) {
  try {
    const transfer = await transferService.createInventoryTransferRequest({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      fromWarehouseId: req.body.fromWarehouseId,
      toWarehouseId: req.body.toWarehouseId,
      items: req.body.items
    });

    res.status(201).json(transfer);
  } catch (error) {
    next(error);
  }
}

export async function listTransfers(req, res, next) {
  try {
    res.json(await transferService.listTransfers({ tenantId: req.tenant.id, query: req.query }));
  } catch (error) {
    next(error);
  }
}

export async function getTransfer(req, res, next) {
  try {
    res.json(await transferService.getTransfer({ tenantId: req.tenant.id, transferId: req.params.id }));
  } catch (error) {
    next(error);
  }
}

export async function approveTransfer(req, res, next) {
  try {
    res.json(await transferService.approveTransfer({ tenantId: req.tenant.id, actorUserId: req.user.id, transferId: req.params.id }));
  } catch (error) {
    next(error);
  }
}

export async function dispatchTransfer(req, res, next) {
  try {
    res.json(await transferService.dispatchTransfer({ tenantId: req.tenant.id, actorUserId: req.user.id, transferId: req.params.id }));
  } catch (error) {
    next(error);
  }
}

export async function receiveTransfer(req, res, next) {
  try {
    res.json(await transferService.receiveTransfer({ tenantId: req.tenant.id, actorUserId: req.user.id, transferId: req.params.id }));
  } catch (error) {
    next(error);
  }
}

export async function cancelTransfer(req, res, next) {
  try {
    res.json(await transferService.cancelTransfer({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      transferId: req.params.id,
      reason: req.body?.reason
    }));
  } catch (error) {
    next(error);
  }
}
