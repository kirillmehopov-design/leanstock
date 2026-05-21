import * as warehouseService from '../services/warehouseService.js';

export async function createWarehouse(req, res, next) {
  try {
    const warehouse = await warehouseService.createWarehouse({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      ...req.body
    });

    res.status(201).json(warehouse);
  } catch (error) {
    next(error);
  }
}

export async function listWarehouses(req, res, next) {
  try {
    const result = await warehouseService.listWarehouses({
      tenantId: req.tenant.id,
      query: req.query
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}


export async function updateWarehouse(req, res, next) {
  try {
    const warehouse = await warehouseService.updateWarehouse({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      warehouseId: req.params.id,
      data: req.body
    });

    res.json(warehouse);
  } catch (error) {
    next(error);
  }
}
