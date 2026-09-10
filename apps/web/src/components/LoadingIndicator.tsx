import { useEffect, useState } from 'react';

const PIPELINE_STAGES = [
  'Querying highway corridor graph...',
  'Evaluating terrain slope & landslide susceptibility...',
  'Checking active weather & precipitation...',
  'Scanning real-time road incidents & closures...',
  'Evaluating corridor accessibility status...',
  'Optimizing multi-criteria safety cost function...',
];

interface LoadingIndicatorProps {
  label?: string;
}

export default function LoadingIndicator({ label = 'Optimizing Route...' }: LoadingIndicatorProps) {
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
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 18,
            height: 18,
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3B82F6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#93C5FD' }}>{label}</span>
      </div>

      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
        {PIPELINE_STAGES[stageIndex]}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
