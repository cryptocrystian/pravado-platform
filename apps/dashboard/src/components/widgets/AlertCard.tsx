// =====================================================
// ALERT CARD WIDGET
// Sprint 40 Phase 3.3.2: Alert/notification component
// =====================================================

import { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertCardProps {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  icon?: ReactNode;
}

export function AlertCard({ type, title, message, action, onDismiss, icon }: AlertCardProps) {
  const typeConfig = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-900',
      iconColor: 'text-green-600',
      Icon: CheckCircle,
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600',
      Icon: Info,
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-900',
      iconColor: 'text-yellow-600',
      Icon: AlertTriangle,
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      iconColor: 'text-red-600',
      Icon: AlertCircle,
    },
  };

  const config = typeConfig[type];
  const IconComponent = icon || <config.Icon className="h-5 w-5" />;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={config.iconColor}>{IconComponent}</div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${config.textColor} mb-1`}>{title}</h4>
          <p className={`text-sm ${config.textColor} opacity-90`}>{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 text-sm font-medium ${config.iconColor} hover:underline`}
            >
              {action.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${config.iconColor} hover:opacity-70`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export interface AlertListProps {
  alerts: Array<AlertCardProps & { id: string }>;
}

export function AlertList({ alerts }: AlertListProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} {...alert} />
      ))}
    </div>
  );
}
