import { Router } from 'express';
import {
  cancelSchedule,
  createSchedule,
  getSchedule,
  listSchedules,
  pauseSchedule,
  pushSchedule,
  resumeSchedule,
} from '../controllers/schedules.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createScheduleSchema,
  listSchedulesQuerySchema,
  pushScheduleSchema,
  scheduleIdParamSchema,
} from '../validators/schedule.validator';

const router = Router();

router.post('/', validate({ body: createScheduleSchema }), asyncHandler(createSchedule));
router.post(
  '/push',
  validate({ body: pushScheduleSchema }),
  asyncHandler(pushSchedule),
);
router.get('/', validate({ query: listSchedulesQuerySchema }), asyncHandler(listSchedules));
router.get('/:id', validate({ params: scheduleIdParamSchema }), asyncHandler(getSchedule));
router.patch(
  '/:id/cancel',
  validate({ params: scheduleIdParamSchema }),
  asyncHandler(cancelSchedule),
);
router.patch(
  '/:id/pause',
  validate({ params: scheduleIdParamSchema }),
  asyncHandler(pauseSchedule),
);
router.patch(
  '/:id/resume',
  validate({ params: scheduleIdParamSchema }),
  asyncHandler(resumeSchedule),
);

export default router;
