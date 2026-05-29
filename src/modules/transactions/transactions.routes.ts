import { Router, RequestHandler } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  getTransactions, getTransaction, createTransaction,
  createExpenseWithSlip, updateTransaction, deleteTransaction,
  uploadSlip, deleteSlip,
} from './transactions.controller';

const router = Router();
router.use(authenticate);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.post('/expense-with-slip', upload.single('slip') as unknown as RequestHandler, createExpenseWithSlip);
router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/:id/slip', upload.single('slip') as unknown as RequestHandler, uploadSlip);
router.put('/:id/slip', upload.single('slip') as unknown as RequestHandler, uploadSlip);
router.delete('/:id/slip', deleteSlip);

export default router;
