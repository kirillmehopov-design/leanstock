import * as catalogService from '../services/catalogService.js';

export async function createSupplier(req, res, next) {
  try {
    const supplier = await catalogService.createSupplier({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      data: req.body
    });
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
}

export async function listSuppliers(req, res, next) {
  try {
    const suppliers = await catalogService.listSuppliers({ tenantId: req.tenant.id, query: req.query });
    res.json(suppliers);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await catalogService.createCategory({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      data: req.body
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

export async function listCategories(req, res, next) {
  try {
    const categories = await catalogService.listCategories({ tenantId: req.tenant.id, query: req.query });
    res.json(categories);
  } catch (error) {
    next(error);
  }
}
