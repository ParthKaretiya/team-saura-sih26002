import type { NextFunction, Request, Response } from 'express';
import { accessibilityService } from '../services/accessibility.service.js';
import { VALID_ACCESSIBILITY_STATUSES, type AccessibilityStatus } from '../types/accessibility.types.js';
import type { RouteGeometry } from '../types/routing.types.js';
import { validateCoordinates, ValidationError } from '../utils/validation.js';

function validateId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new ValidationError('Accessibility corridor ID is invalid.');
  }
  return value;
}

function validateStatus(value: unknown): AccessibilityStatus {
  if (typeof value !== 'string' || !VALID_ACCESSIBILITY_STATUSES.includes(value as AccessibilityStatus)) {
    throw new ValidationError(`Invalid accessibility status "${value}". Allowed values: ${VALID_ACCESSIBILITY_STATUSES.join(', ')}`);
  }
  return value as AccessibilityStatus;
}

function validateOptionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${field}" must be a non-empty string when provided.`);
  }
  return value.trim();
}

function validateGeometry(value: unknown): RouteGeometry {
  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    throw new ValidationError('geometry must be a GeoJSON LineString with at least two coordinates.');
  }

  return {
    type: 'LineString',
    coordinates: geometry.coordinates.map((point, index) => {
      if (!Array.isArray(point) || point.length !== 2) {
        throw new ValidationError(`geometry coordinate at index ${index} must be a [longitude, latitude] pair.`);
      }
      const coordinate = validateCoordinates(point[1], point[0]);
      return [coordinate.longitude, coordinate.latitude];
    }),
  };
}

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({ status: 'error', message: error.message });
    return;
  }
  next(error);
}

export async function listAccessibility(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await accessibilityService.getAccessibilityFeatures());
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function createAccessibility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const name = validateOptionalText(body.name, 'name');
    const source = validateOptionalText(body.source, 'source');
    if (!name || !source) {
      throw new ValidationError('Both "name" and "source" are required.');
    }
    const roadCode = validateOptionalText(body.road_code, 'road_code');
    const reason = validateOptionalText(body.reason, 'reason');
    const record = await accessibilityService.createAccessibility({
      name,
      source,
      status: validateStatus(body.status),
      geometry: validateGeometry(body.geometry),
      ...(roadCode ? { road_code: roadCode } : {}),
      ...(reason ? { reason } : {}),
    });
    res.status(201).json({ status: 'success', data: record });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateAccessibilityStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = validateId(req.params.id);
    const body = req.body as Record<string, unknown>;
    const updated = await accessibilityService.updateAccessibilityStatus(
      id,
      validateStatus(body.status),
      validateOptionalText(body.reason, 'reason'),
    );
    if (!updated) {
      res.status(404).json({ status: 'error', message: `Accessibility corridor with ID "${id}" was not found.` });
      return;
    }
    res.json({ status: 'success', data: updated });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function deleteAccessibility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = validateId(req.params.id);
    if (!await accessibilityService.deleteAccessibility(id)) {
      res.status(404).json({ status: 'error', message: `Accessibility corridor with ID "${id}" was not found.` });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleError(error, res, next);
  }
}
