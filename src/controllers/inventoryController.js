import * as inventoryService from '../services/inventoryService.js';
import { getDeadStockPolicy as readDeadStockPolicy, runDeadStockDecay, updateDeadStockPolicy as saveDeadStockPolicy } from '../services/decayService.js';

export async function receiveBatch(req, res, next) {
  try { res.status(201).json(await inventoryService.receiveBatch({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body })); }
  catch (error) { next(error); }
}

export async function adjustInventory(req, res, next) {
  try { res.json(await inventoryService.adjustInventory({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body })); }
  catch (error) { next(error); }
}

export async function reportInventoryIssue(req, res, next) {
  try { res.status(201).json(await inventoryService.reportInventoryIssue({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body })); }
  catch (error) { next(error); }
}

export async function listInventoryIssueReports(req, res, next) {
  try { res.json(await inventoryService.listInventoryIssueReports({ tenantId: req.tenant.id, query: req.query })); }
  catch (error) { next(error); }
}


export async function getInventoryIssueReport(req, res, next) {
  try { res.json(await inventoryService.getInventoryIssueReport({ tenantId: req.tenant.id, reportId: req.params.id })); }
  catch (error) { next(error); }
}

export async function approveInventoryIssueReport(req, res, next) {
  try { res.json(await inventoryService.approveInventoryIssueReport({ tenantId: req.tenant.id, actorUserId: req.user.id, reportId: req.params.id, resolutionNote: req.body?.resolutionNote })); }
  catch (error) { next(error); }
}

export async function rejectInventoryIssueReport(req, res, next) {
  try { res.json(await inventoryService.rejectInventoryIssueReport({ tenantId: req.tenant.id, actorUserId: req.user.id, reportId: req.params.id, resolutionNote: req.body?.resolutionNote })); }
  catch (error) { next(error); }
}

export async function lowStockReport(req, res, next) {
  try { res.json({ data: await inventoryService.lowStockReport({ tenantId: req.tenant.id }) }); }
  catch (error) { next(error); }
}

export async function deadStockReport(req, res, next) {
  try { res.json({ data: await inventoryService.deadStockReport({ tenantId: req.tenant.id }) }); }
  catch (error) { next(error); }
}

export async function inventorySnapshot(req, res, next) {
  try { res.json(await inventoryService.inventorySnapshot({ tenantId: req.tenant.id, query: req.query })); }
  catch (error) { next(error); }
}

export async function forecastReorderSuggestions(req, res, next) {
  try { res.json({ data: await inventoryService.forecastReorderSuggestions({ tenantId: req.tenant.id }) }); }
  catch (error) { next(error); }
}

export async function getDeadStockPolicy(req, res, next) {
  try { res.json(await readDeadStockPolicy(req.tenant.id)); }
  catch (error) { next(error); }
}

export async function updateDeadStockPolicy(req, res, next) {
  try { res.json(await saveDeadStockPolicy({ tenantId: req.tenant.id, actorUserId: req.user.id, data: req.body })); }
  catch (error) { next(error); }
}

export async function runDeadStockDecayNow(req, res, next) {
  try { res.json(await runDeadStockDecay(new Date(), req.tenant.id)); }
  catch (error) { next(error); }
}
