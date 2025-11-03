// =====================================================
// DATA TABLE WIDGET
// Sprint 40 Phase 3.3.2: Reusable data table component
// =====================================================

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T) => string;
}

export function DataTable<T = any>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  keyExtractor = (item: any) => item.id,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-sm font-semibold ${
                  alignmentClasses[column.align || 'left']
                }`}
              >
                {column.label}
              </th>
            ))}
            {onRowClick && <th className="w-8"></th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={`border-b hover:bg-muted/50 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm ${alignmentClasses[column.align || 'left']}`}
                >
                  {column.render
                    ? column.render(item)
                    : (item as any)[column.key]}
                </td>
              ))}
              {onRowClick && (
                <td className="px-4 py-3 text-sm text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTableSkeleton() {
  return (
    <DataTable
      columns={[
        { key: 'col1', label: 'Column 1' },
        { key: 'col2', label: 'Column 2' },
      ]}
      data={[]}
      loading={true}
    />
  );
}
