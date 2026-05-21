import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import membershipRoutes from './membershipRoutes.js';
import warehouseRoutes from './warehouseRoutes.js';
import productRoutes from './productRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import transferRoutes from './transferRoutes.js';
import reportRoutes from './reportRoutes.js';
import jobRoutes from './jobRoutes.js';
import catalogRoutes from './catalogRoutes.js';
import reservationRoutes from './reservationRoutes.js';
import saleRoutes from './saleRoutes.js';
import platformRoutes from './platformRoutes.js';
import auditRoutes from './auditRoutes.js';
import purchaseOrderRoutes from './purchaseOrderRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/transfers', transferRoutes);
router.use('/reports', reportRoutes);
router.use('/jobs', jobRoutes);
router.use('/catalog', catalogRoutes);
router.use('/reservations', reservationRoutes);
router.use('/sales', saleRoutes);
router.use('/platform', platformRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

export default router;
