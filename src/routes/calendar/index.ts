import { Router, type NextFunction, type Request, type Response } from 'express';
import { currentUserIdFromAuthorization } from '../../services/calendarAccessPolicy';
import bootstrapRoutes from './bootstrap';
import eventsRoutes from './events';
import assigneesRoutes from './assignees';
import categoriesRoutes from './categories';
import servicesRoutes from './services';

const router = Router();

/**
 * Refuses a request without a usable session token (missing header, unreadable JWT, no user id) with a 401
 * before any upstream call. Calendar API still verifies the signature on every call the BFF makes.
 */
function requireSession(req: Request, _res: Response, next: NextFunction): void {
  currentUserIdFromAuthorization(req.headers.authorization);
  next();
}

// All the calendar sub-routes. Categories and services are static lists and stay public.
router.use('/bootstrap', requireSession, bootstrapRoutes);
router.use('/events', requireSession, eventsRoutes);
router.use('/assignees', requireSession, assigneesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/services', servicesRoutes);

export default router;
