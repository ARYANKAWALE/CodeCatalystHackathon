import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, { type = 'success', duration = 4500 } = {}) => {
      const id = ++_id;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container rendered at provider level */}
      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-item toast-item--${t.type}`}>
              <i
                className={`bi ${
                  t.type === 'success'
                    ? 'bi-check-circle-fill'
                    : t.type === 'error'
                      ? 'bi-exclamation-triangle-fill'
                      : 'bi-info-circle-fill'
                }`}
                aria-hidden
              />
              <span className="toast-item__msg">{t.message}</span>
              <button
                type="button"
                className="toast-item__close"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
