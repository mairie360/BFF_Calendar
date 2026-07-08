import { Router } from 'express';
import bootstrapRoutes from './bootstrap';
import eventsRoutes from './events';
import assigneesRoutes from './assignees';
import categoriesRoutes from './categories';
import servicesRoutes from './services';

const router = Router();

// Agrégation de toutes les sous-routes du calendrier
router.use('/bootstrap', bootstrapRoutes);
router.use('/events', eventsRoutes);
router.use('/assignees', assigneesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/services', servicesRoutes);

export default router;
