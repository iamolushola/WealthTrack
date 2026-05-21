import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastMessage } from './toast';

const DISMISS_AFTER_MS = 5000;

export function ToastContainer(): React.ReactElement | null {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsub = subscribeToasts((msg) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, DISMISS_AFTER_MS);
    });
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.level}`} role="alert">
          <span className="toast__message">{t.message}</span>
          {t.requestId && (
            <span className="toast__meta" title="Reference ID for support">
              ref: {t.requestId.slice(0, 8)}
            </span>
          )}
          <button
            className="toast__close"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
