export interface SeverityVisualConfig {
  color: string;
  radius: number;
  label: string;
  badgeBg: string;
  badgeText: string;
}

export const SEVERITY_THEME: Record<string, SeverityVisualConfig> = {
  CRITICAL: {
    color: '#EF4444', // Crimson
    radius: 10,
    label: 'Critical Hazard',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
  },
  HIGH: {
    color: '#F97316', // Orange
    radius: 8,
    label: 'High Risk',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
  },
  MEDIUM: {
    color: '#F59E0B', // Amber
    radius: 7,
    label: 'Moderate Risk',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  LOW: {
    color: '#3B82F6', // Blue
    radius: 6,
    label: 'Low Risk',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
  },
};

export const RISK_LEVEL_THEME: Record<string, { color: string; bg: string; text: string; label: string; border: string }> = {
  CRITICAL: { color: '#DC2626', bg: '#FEF2F2', text: '#991B1B', label: 'CRITICAL RISK', border: '#F87171' },
  HIGH: { color: '#EA580C', bg: '#FFF7ED', text: '#9A3412', label: 'HIGH RISK', border: '#FB923C' },
  MEDIUM: { color: '#D97706', bg: '#FFFBEB', text: '#92400E', label: 'MEDIUM RISK', border: '#FCD34D' },
  LOW: { color: '#059669', bg: '#ECFDF5', text: '#065F46', label: 'LOW RISK', border: '#6EE7B7' },
};

export const DEFAULT_SEVERITY_CONFIG: SeverityVisualConfig = {
  color: '#6B7280',
  radius: 6,
  label: 'Unknown',
  badgeBg: '#F3F4F6',
  badgeText: '#374151',
};

export const VEHICLE_THEME = {
  activeColor: '#10B981', // Emerald
  idleColor: '#6B7280',   // Gray
  radius: 7,
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
};

export const ROUTE_THEME = {
  lineColor: '#2563EB', // Electric Blue
  casingColor: '#1E3A8A',
  lineWidth: 6,
  lineOpacity: 0.95,
};

export const BASELINE_ROUTE_THEME = {
  lineColor: '#94A3B8', // Slate / Gray
  casingColor: '#475569',
  lineWidth: 3.5,
  lineOpacity: 0.85,
};

export const SELECTED_ROUTE_THEME = {
  lineColor: '#2563EB', // Strong Royal Blue - visually dominant
  casingColor: '#1E3A8A',
  lineWidth: 6,
  lineOpacity: 0.95,
};

export const HAZARD_ZONE_THEME = {
  color: '#8B5CF6', // Purple
  radius: 8,
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
};

export const ACCESSIBILITY_THEME = {
  OPEN: { color: '#10B981', label: 'Open Corridor', description: 'Normal movement' },
  RESTRICTED: { color: '#F59E0B', label: 'Restricted Corridor', description: 'Movement with caution' },
  CLOSED: { color: '#DC2626', label: 'Closed Corridor', description: 'Avoid / excluded from route' },
} as const;

export const PRESET_CORRIDORS = [
  {
    name: 'Guwahati → Shillong',
    fromLabel: 'Guwahati, Assam',
    toLabel: 'Shillong, Meghalaya',
    origin: '26.1445, 91.7362',
    destination: '25.5788, 91.8933',
    highway: 'NH-6 Corridor',
  },
  {
    name: 'Guwahati → Tezpur',
    fromLabel: 'Guwahati, Assam',
    toLabel: 'Tezpur, Assam',
    origin: '26.1445, 91.7362',
    destination: '26.6338, 92.7926',
    highway: 'NH-27 / NH-15 Corridor',
  },
  {
    name: 'Shillong → Cherrapunji',
    fromLabel: 'Shillong, Meghalaya',
    toLabel: 'Sohra (Cherrapunji)',
    origin: '25.5788, 91.8933',
    destination: '25.2702, 91.7323',
    highway: 'SH-5 Hill Pass',
  },
];
