import { Router } from 'express';
import { noStore, requireSession } from '@mairie360/bffs-lib';
import bootstrapRoutes from './bootstrap';
import eventsRoutes from './events';
import assigneesRoutes from './assignees';
import categoriesRoutes from './categories';
import servicesRoutes from './services';

const router = Router();

// Session-bound sub-routes: never cached, and refused with a 401 before any upstream call unless the request
// carries a valid `Authorization: Bearer <token>`: `requireSession` verifies it (HS256 with JWT_SECRET, expiry,
// MAIR-474). Calendar API and Core API still check revocation and archived accounts on every call.
// Categories and services are static lists and stay public.
router.use('/bootstrap', noStore, requireSession, bootstrapRoutes);
router.use('/events', noStore, requireSession, eventsRoutes);
router.use('/assignees', noStore, requireSession, assigneesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/services', servicesRoutes);

export default router;
