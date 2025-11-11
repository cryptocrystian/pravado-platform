import * as React from 'react';

function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = `animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`.trim();

  return (
    <div
      className={classes}
      {...props}
    />
  );
}

export { Skeleton };
