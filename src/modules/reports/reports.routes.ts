import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getMonthlyReport, getSummary, getOverspending, getRecommendations } from './reports.controller';

const router = Router();
router.use(authenticate);

router.get('/monthly', getMonthlyReport);
router.get('/summary', getSummary);
router.get('/overspending', getOverspending);
router.get('/recommendations', getRecommendations);

export default router;
