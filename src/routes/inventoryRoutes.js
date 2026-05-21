import { Router } from 'express';
import {
  adjustInventory,
  approveInventoryIssueReport,
  getInventoryIssueReport,
  listInventoryIssueReports,
  receiveBatch,
  rejectInventoryIssueReport,
  reportInventoryIssue
} from '../controllers/inventoryController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adjustInventorySchema,
  createIssueReportSchema,
  issueReportIdParamsSchema,
  receiveBatchSchema,
  resolveIssueReportSchema
} from '../validators/inventorySchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.post('/batches', requireRoles(['OWNER', 'MANAGER', 'STAFF']), validate(receiveBatchSchema), receiveBatch);
router.post('/adjustments', requireRoles(['OWNER', 'MANAGER']), validate(adjustInventorySchema), adjustInventory);
router.post('/issue-reports', requireRoles(['OWNER', 'MANAGER', 'STAFF']), validate(createIssueReportSchema), reportInventoryIssue);
router.get('/issue-reports', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), listInventoryIssueReports);
router.post('/issue-reports/:id/approve', requireRoles(['OWNER', 'MANAGER']), validate(resolveIssueReportSchema), approveInventoryIssueReport);
router.post('/issue-reports/:id/reject', requireRoles(['OWNER', 'MANAGER']), validate(resolveIssueReportSchema), rejectInventoryIssueReport);
router.get('/issue-reports/:id', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), validate(issueReportIdParamsSchema), getInventoryIssueReport);

export default router;
