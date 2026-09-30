import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastContextValue {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: Toast['type']) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const showError = useCallback(
    (message: string) => showToast(message, 'error'),
    [showToast],
  );

  const showSuccess = useCallback(
    (message: string) => showToast(message, 'success'),
    [showToast],
  );

  const showInfo = useCallback(
    (message: string) => showToast(message, 'info'),
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background:
                t.type === 'error'
                  ? '#D93025'
                  : t.type === 'success'
                    ? '#1E8E3E'
                    : '#0077FF',
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
              maxWidth: 400,
              textAlign: 'center',
              animation: 'toast-in 0.3s ease',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}