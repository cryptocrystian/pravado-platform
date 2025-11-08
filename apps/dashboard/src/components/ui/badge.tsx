import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-blue-500 text-white',
      secondary: 'bg-gray-500 text-white',
      destructive: 'bg-red-500 text-white',
      outline: 'border border-gray-300 bg-transparent text-gray-700'
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className || ''}`}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
