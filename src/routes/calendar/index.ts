import { Router } from 'express';
import { noStore, requireBearer } from '@mairie360/bffs-lib';
import bootstrapRoutes from './bootstrap';
import eventsRoutes from './events';
import assigneesRoutes from './assignees';
import categoriesRoutes from './categories';
import servicesRoutes from './services';

const router = Router();

// Session-bound sub-routes: never cached, and refused with a 401 before any upstream call when the request
// carries no `Authorization: Bearer <token>` (Calendar API and Core API verify the token on every call).
// Categories and services are static lists and stay public.
router.use('/bootstrap', noStore, requireBearer, bootstrapRoutes);
router.use('/events', noStore, requireBearer, eventsRoutes);
router.use('/assignees', noStore, requireBearer, assigneesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/services', servicesRoutes);

export default router;
