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

export const RISK_LEVEL_THEME: Record<string, { color: string; bg: string; text: string }> = {
  CRITICAL: { color: '#DC2626', bg: '#FEE2E2', text: '#991B1B' },
  HIGH: { color: '#EA580C', bg: '#FFEDD5', text: '#9A3412' },
  MEDIUM: { color: '#D97706', bg: '#FEF3C7', text: '#92400E' },
  LOW: { color: '#059669', bg: '#D1FAE5', text: '#065F46' },
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

export const ROUTE_THEME = {
  lineColor: '#2563EB', // Blue
  lineWidth: 5,
  lineOpacity: 0.9,
};

export const BASELINE_ROUTE_THEME = {
  lineColor: '#9CA3AF', // Gray
  casingColor: '#6B7280',
  lineWidth: 3,
  lineOpacity: 0.85,
};

export const SELECTED_ROUTE_THEME = {
  lineColor: '#059669', // Emerald
  casingColor: '#065F46',
  lineWidth: 5,
  lineOpacity: 0.95,
};

export const HAZARD_ZONE_THEME = {
  color: '#8B5CF6', // Purple
  radius: 8,
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
};
