const PIPELINE_STAGES = [
  'Fetch highway routing graph',
  'Score route risk & terrain slope',
  'Check accessibility & corridor advisories',
  'Run landslide susceptibility inference',
  'Optimize multi-criteria safety cost',
];

interface LoadingIndicatorProps {
  label?: string;
}

export default function LoadingIndicator({ label = 'CALCULATING ROUTE...' }: LoadingIndicatorProps) {
  // The backend reports no per-stage progress, so we do not fake a determinate
  // "step N of 5" bar. We show an indeterminate sweep plus the pipeline the
  // engine runs — described as capabilities, not live progress.
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

      <div className="loading-indeterminate-track" aria-hidden="true" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Optimization pipeline
        </div>
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: '#CBD5E1',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: '#38BDF8', fontSize: 8 }}>▹</span>
            <span>{stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
