import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from './payment-methods.controller';

const router = Router();
router.use(authenticate);

router.get('/', getPaymentMethods);
router.post('/', createPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);

export default router;
