import { AppError } from '../errors/AppError.js';
import * as productService from '../services/productService.js';

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body });
    res.status(201).json(product);
  } catch (error) { next(error); }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct({ tenantId: req.tenant.id, actorUserId: req.user.id, productId: req.params.id, data: req.body });
    res.json(product);
  } catch (error) { next(error); }
}

export async function archiveProduct(req, res, next) {
  try {
    const result = await productService.archiveProduct({ tenantId: req.tenant.id, actorUserId: req.user.id, productId: req.params.id });
    res.json(result);
  } catch (error) { next(error); }
}

export async function listProducts(req, res, next) {
  try { res.json(await productService.listProducts({ tenantId: req.tenant.id, query: req.query })); }
  catch (error) { next(error); }
}

export async function getProduct(req, res, next) {
  try {
    const product = await productService.getProduct({ tenantId: req.tenant.id, productId: req.params.id });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    res.json(product);
  } catch (error) { next(error); }
}
