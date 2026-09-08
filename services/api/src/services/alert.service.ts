import { ACCESSIBILITY_CONFIG } from '../config/accessibility.config.js';
import { accessibilityService } from './accessibility.service.js';
import type { AlertCollection, AlertRecord } from '../types/alert.types.js';

export class AlertService {
  /**
   * Computes the current accessibility alerts from corridor state. Alerts are
   * derived on read so no notification or persistence subsystem is needed.
   */
  async listAlerts(): Promise<AlertCollection> {
    const corridors = await accessibilityService.listAccessibility();
    const items: AlertRecord[] = corridors.flatMap((corridor) => {
      if (corridor.status === 'OPEN') return [];

      const isClosed = corridor.status === 'CLOSED';
      return [{
        id: `accessibility-${corridor.id}-${corridor.status.toLowerCase()}`,
        category: isClosed ? 'ROAD_CLOSURE' : 'ROAD_RESTRICTION',
        severity: isClosed
          ? ACCESSIBILITY_CONFIG.alerts.roadClosureSeverity
          : ACCESSIBILITY_CONFIG.alerts.roadRestrictionSeverity,
        title: isClosed ? `Road closure: ${corridor.name}` : `Road restriction: ${corridor.name}`,
        message: corridor.reason
          ?? (isClosed ? 'This corridor is currently closed.' : 'This corridor is currently restricted.'),
        accessibilityCorridorId: corridor.id,
        accessibilityStatus: corridor.status,
        created_at: corridor.updated_at,
        updated_at: corridor.updated_at,
      }];
    });

    items.sort((left, right) => left.id.localeCompare(right.id));
    return { items };
  }
}

export const alertService = new AlertService();
