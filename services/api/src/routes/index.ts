import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';
import { getWeather } from '../controllers/weather.controller.js';
import {
  createIncident,
  listIncidents,
  updateIncidentStatus,
} from '../controllers/incident.controller.js';

const router = Router();

// Health
router.get('/health', healthCheck);

// Weather
router.get('/weather', getWeather);

// Incidents
router.post('/incidents', createIncident);
router.get('/incidents', listIncidents);
router.patch('/incidents/:id/status', updateIncidentStatus);

export default router;
