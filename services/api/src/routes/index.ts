import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';
import { getWeather } from '../controllers/weather.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/weather', getWeather);

export default router;
