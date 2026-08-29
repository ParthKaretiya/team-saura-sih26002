import {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  VALID_INCIDENT_TYPES,
  VALID_SEVERITIES,
  VALID_STATUSES,
  ALLOWED_STATUS_TRANSITIONS,
} from '../types/incident.types.js';

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateCoordinates(lat: unknown, lon: unknown): { latitude: number; longitude: number } {
  if (lat === undefined || lat === null || lon === undefined || lon === null) {
    throw new ValidationError('Both latitude and longitude are required.');
  }

  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));

  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new ValidationError(`Invalid latitude: must be a number between -90 and 90, got "${lat}".`);
  }

  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new ValidationError(`Invalid longitude: must be a number between -180 and 180, got "${lon}".`);
  }

  return { latitude, longitude };
}

export function validateIncidentType(type: unknown): IncidentType {
  if (!type || typeof type !== 'string' || !VALID_INCIDENT_TYPES.includes(type as IncidentType)) {
    throw new ValidationError(
      `Invalid incident type "${type}". Allowed values: ${VALID_INCIDENT_TYPES.join(', ')}`
    );
  }
  return type as IncidentType;
}

export function validateSeverity(severity: unknown): IncidentSeverity {
  if (!severity || typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity as IncidentSeverity)) {
    throw new ValidationError(
      `Invalid severity "${severity}". Allowed values: ${VALID_SEVERITIES.join(', ')}`
    );
  }
  return severity as IncidentSeverity;
}

export function validateIncidentStatus(status: unknown): IncidentStatus {
  if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status as IncidentStatus)) {
    throw new ValidationError(
      `Invalid status "${status}". Allowed values: ${VALID_STATUSES.join(', ')}`
    );
  }
  return status as IncidentStatus;
}

export function validateStatusTransition(currentStatus: IncidentStatus, newStatus: IncidentStatus): void {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(
      `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${
        allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'
      }`
    );
  }
}
