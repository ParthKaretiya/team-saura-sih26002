interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({
  title = 'Route Service Alert',
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div
      style={{
        padding: '12px 14px',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: 8,
        color: '#FCA5A5',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: '#F87171' }}>
          <span>⚠️</span>
          <span>{title}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '2px 8px',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid #EF4444',
              borderRadius: 4,
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#FECACA', lineHeight: 1.4 }}>{message}</div>
    </div>
  );
}
