import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getBudgets, getMonthlyBudget, createBudget, updateBudget, deleteBudget } from './budgets.controller';

const router = Router();
router.use(authenticate);

router.get('/', getBudgets);
router.get('/monthly', getMonthlyBudget);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
