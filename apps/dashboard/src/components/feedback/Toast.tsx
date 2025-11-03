// =====================================================
// TOAST NOTIFICATION SYSTEM
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toastVariants } from '../../utils/animations';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = {
        id,
        type,
        message,
        duration,
        dismissible: true,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        return updated.slice(-maxToasts);
      });

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [maxToasts]
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: '24px', right: '24px' };
      case 'top-left':
        return { ...base, top: '24px', left: '24px' };
      case 'bottom-right':
        return { ...base, bottom: '24px', right: '24px' };
      case 'bottom-left':
        return { ...base, bottom: '24px', left: '24px' };
      case 'top-center':
        return { ...base, top: '24px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-center':
        return { ...base, bottom: '24px', left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...base, top: '24px', right: '24px' };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div style={getPositionStyles()}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={hideToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const getToastStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      maxWidth: '500px',
      pointerEvents: 'auto',
      fontSize: '14px',
      fontWeight: 500,
    };

    const colors: Record<ToastType, { bg: string; text: string; border: string }> = {
      success: { bg: '#10b981', text: '#ffffff', border: '#059669' },
      error: { bg: '#ef4444', text: '#ffffff', border: '#dc2626' },
      warning: { bg: '#f59e0b', text: '#ffffff', border: '#d97706' },
      info: { bg: '#3b82f6', text: '#ffffff', border: '#2563eb' },
    };

    const color = colors[toast.type];

    return {
      ...base,
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
    };
  };

  const getIcon = () => {
    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[toast.type];
  };

  return (
    <motion.div
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={getToastStyles()}
      role="alert"
      aria-live="polite"
    >
      <span style={{ fontSize: '18px' }}>{getIcon()}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.dismissible && (
        <button
          onClick={() => onDismiss(toast.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px',
            lineHeight: 1,
          }}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
};

export default ToastProvider;
