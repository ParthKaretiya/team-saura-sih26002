import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';
import { getWeather } from '../controllers/weather.controller.js';
import {
  createIncident,
  listIncidents,
  updateIncidentStatus,
} from '../controllers/incident.controller.js';
import {
  listVehicles,
  updateVehicleLocation,
} from '../controllers/vehicle.controller.js';
import { getRoute } from '../controllers/route.controller.js';
import {
  getPointRisk,
  evaluateRouteRisk,
  getHazardZones,
} from '../controllers/risk.controller.js';
import {
  getMLPrediction,
  postMLPrediction,
  getMLModelInfo,
} from '../controllers/ml.controller.js';

const router = Router();

// Health
router.get('/health', healthCheck);

// Weather
router.get('/weather', getWeather);

// Incidents
router.post('/incidents', createIncident);
router.get('/incidents', listIncidents);
router.patch('/incidents/:id/status', updateIncidentStatus);

// Vehicles
router.get('/vehicles', listVehicles);
router.post('/vehicles/:id/location', updateVehicleLocation);

// Routing
router.get('/routes', getRoute);

// Risk Intelligence
router.get('/risk/point', getPointRisk);
router.post('/risk/route', evaluateRouteRisk);
router.get('/risk/zones', getHazardZones);

// Machine Learning Classifiers
router.get('/ml/predict', getMLPrediction);
router.post('/ml/predict', postMLPrediction);
router.get('/ml/model', getMLModelInfo);

export default router;
