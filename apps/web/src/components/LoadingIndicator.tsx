import { useEffect, useState } from 'react';

const PIPELINE_STAGES = [
  'Fetching routing data from highway graph...',
  'Analyzing route risk & terrain slope...',
  'Checking accessibility & corridor advisories...',
  'Evaluating landslide susceptibility inference...',
  'Optimizing multi-criteria safety cost function...',
];

interface LoadingIndicatorProps {
  label?: string;
}

export default function LoadingIndicator({ label = 'CALCULATING ROUTE...' }: LoadingIndicatorProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        padding: '14px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(56, 189, 248, 0.25)',
              borderTopColor: '#38BDF8',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#38BDF8', letterSpacing: 0.5 }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
          Step {stageIndex + 1}/{PIPELINE_STAGES.length}
        </span>
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#E2E8F0',
          fontFamily: 'var(--font-mono)',
          padding: '6px 10px',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          borderRadius: 4,
          borderLeft: '3px solid #38BDF8',
        }}
      >
        {PIPELINE_STAGES[stageIndex]}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {PIPELINE_STAGES.map((_, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: idx <= stageIndex ? '#38BDF8' : 'rgba(51, 65, 85, 0.6)',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
