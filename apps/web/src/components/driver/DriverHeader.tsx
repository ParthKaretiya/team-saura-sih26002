import { useEffect, useState } from 'react';

interface DriverHeaderProps {
  isLive: boolean;
  onExit?: () => void;
}

export default function DriverHeader({ isLive, onExit }: DriverHeaderProps) {
  const [now, setNow] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="driver-header">
      <div className="driver-header-brand">
        <span className="driver-header-mark" aria-hidden="true">
          SR
        </span>
        <span className="driver-header-name">SAURAROUTE</span>
        <span className="driver-header-mode">DRIVER</span>
      </div>

      <div className="driver-header-status">
        <span className={`driver-status-chip ${isLive ? 'driver-status-on' : 'driver-status-off'}`}>
          <span className="driver-status-dot" />
          <span>{isLive ? 'ONLINE' : 'OFFLINE'}</span>
        </span>
        <span className="driver-header-time">{now}</span>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="driver-header-exit-btn"
            title="Switch to Operations Command Center"
            aria-label="Switch to Operations Command Center"
          >
            Ops Center
          </button>
        )}
      </div>
    </header>
  );
}