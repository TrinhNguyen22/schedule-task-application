import { Router } from 'express';
import { healthCheck, readinessCheck } from '../controllers/health.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/health', asyncHandler(healthCheck));
router.get('/ready', asyncHandler(readinessCheck));

export default router;
