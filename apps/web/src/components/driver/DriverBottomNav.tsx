export type DriverTab = 'navigate' | 'route' | 'safety' | 'alerts' | 'more';

interface DriverBottomNavProps {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
  alertCount: number;
}

const TABS: { key: DriverTab; label: string; icon: string }[] = [
  { key: 'navigate', label: 'Navigate', icon: '🧭' },
  { key: 'route', label: 'Route', icon: '🛣️' },
  { key: 'safety', label: 'Safety', icon: '🛡️' },
  { key: 'alerts', label: 'Alerts', icon: '🔔' },
  { key: 'more', label: 'More', icon: '⋯' },
];

export default function DriverBottomNav({ activeTab, onTabChange, alertCount }: DriverBottomNavProps) {
  return (
    <nav className="driver-bottom-nav" aria-label="Driver Mode Navigation">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`driver-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
          aria-current={activeTab === tab.key ? 'page' : undefined}
        >
          <span className="driver-nav-icon">{tab.icon}</span>
          <span className="driver-nav-label">{tab.label}</span>
          {tab.key === 'alerts' && alertCount > 0 && (
            <span className="driver-nav-badge">{alertCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}