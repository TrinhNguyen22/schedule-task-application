import { Router } from 'express';
import healthRoutes from './health.routes';
import schedulesRoutes from './schedules.routes';

const router = Router();

router.use(healthRoutes);
router.use('/api/schedules', schedulesRoutes);

export default router;
