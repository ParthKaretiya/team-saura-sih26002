interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({
  title = 'ROUTE CALCULATION FAILED',
  message,
  onRetry,
}: ErrorMessageProps) {
  // Extract clean message, avoiding stack traces if any
  const cleanMessage = message.includes('\n') ? message.split('\n')[0] : message;

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
        gap: 8,
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 11, color: '#F87171', letterSpacing: 0.5 }}>
          <span>⚠️</span>
          <span>{title}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '3px 10px',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid #EF4444',
              borderRadius: 4,
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            Retry
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#FECACA', lineHeight: 1.4 }}>
        {cleanMessage || 'Routing service is currently unavailable.'}
      </div>
    </div>
  );
}
