export interface SeverityVisualConfig {
  color: string;
  radius: number;
  label: string;
  badgeBg: string;
}

export const SEVERITY_THEME: Record<string, SeverityVisualConfig> = {
  CRITICAL: {
    color: '#EF4444', // Red
    radius: 10,
    label: 'Critical Hazard',
    badgeBg: '#FEE2E2',
  },
  HIGH: {
    color: '#F97316', // Orange
    radius: 8,
    label: 'High Risk',
    badgeBg: '#FFEDD5',
  },
  MEDIUM: {
    color: '#F59E0B', // Amber
    radius: 7,
    label: 'Moderate Risk',
    badgeBg: '#FEF3C7',
  },
  LOW: {
    color: '#3B82F6', // Blue
    radius: 6,
    label: 'Low Risk',
    badgeBg: '#DBEAFE',
  },
};

export const DEFAULT_SEVERITY_CONFIG: SeverityVisualConfig = {
  color: '#6B7280',
  radius: 6,
  label: 'Unknown',
  badgeBg: '#F3F4F6',
};

export const VEHICLE_THEME = {
  activeColor: '#10B981', // Emerald
  idleColor: '#6B7280',   // Gray
  radius: 7,
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
};
