'use client';

import { useUserFollowUps, useCompleteFollowUp, useDeleteFollowUp } from '../../hooks/useCRM';
import { FollowUpStatus, FollowUpPriority } from '@pravado/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

interface FollowUpListProps {
  status?: FollowUpStatus;
  limit?: number;
  title?: string;
}

export function FollowUpList({ status, limit = 50, title = 'Follow-Ups' }: FollowUpListProps) {
  const { data: followUps, isLoading } = useUserFollowUps(status, limit);
  const completeFollowUp = useCompleteFollowUp();
  const deleteFollowUp = useDeleteFollowUp();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (!followUps || followUps.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="text-center text-gray-500">
          No follow-ups found.
        </div>
      </Card>
    );
  }

  const getPriorityColor = (priority: FollowUpPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDueDateLabel = (dueDate: Date) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return {
        label: `Overdue by ${formatDistanceToNow(date)}`,
        color: 'text-red-600',
      };
    }
    if (isToday(date)) {
      return {
        label: 'Due Today',
        color: 'text-orange-600',
      };
    }
    if (isTomorrow(date)) {
      return {
        label: 'Due Tomorrow',
        color: 'text-yellow-600',
      };
    }
    return {
      label: `Due ${formatDistanceToNow(date, { addSuffix: true })}`,
      color: 'text-gray-600',
    };
  };

  const handleComplete = async (id: string) => {
    const notes = prompt('Add completion notes (optional):');
    await completeFollowUp.mutateAsync({
      id,
      completionNotes: notes || undefined,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this follow-up?')) {
      await deleteFollowUp.mutateAsync(id);
    }
  };

  // Separate overdue, today, and upcoming
  const overdue = followUps.filter(
    (f) => isPast(new Date(f.dueDate)) && !isToday(new Date(f.dueDate))
  );
  const today = followUps.filter((f) => isToday(new Date(f.dueDate)));
  const upcoming = followUps.filter(
    (f) => !isPast(new Date(f.dueDate)) && !isToday(new Date(f.dueDate))
  );

  const renderFollowUp = (followUp: any) => {
    const dueDateInfo = getDueDateLabel(followUp.dueDate);

    return (
      <div
        key={followUp.id}
        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{followUp.title}</h4>
              <span
                className={`text-xs px-2 py-1 rounded border ${getPriorityColor(followUp.priority)}`}
              >
                {followUp.priority}
              </span>
            </div>

            <div className={`text-sm font-medium ${dueDateInfo.color}`}>
              {dueDateInfo.label}
            </div>

            {followUp.notes && (
              <div className="text-sm text-gray-600 mt-2">{followUp.notes}</div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {followUp.status === 'PENDING' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleComplete(followUp.id)}
                disabled={completeFollowUp.isPending}
              >
                Complete
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleDelete(followUp.id)}
              disabled={deleteFollowUp.isPending}
            >
              Delete
            </Button>
          </div>
        </div>

        {followUp.status === 'COMPLETED' && followUp.completedAt && (
          <div className="mt-2 pt-2 border-t text-xs text-gray-500">
            Completed {formatDistanceToNow(new Date(followUp.completedAt), { addSuffix: true })}
            {followUp.completionNotes && (
              <div className="mt-1 text-gray-600">{followUp.completionNotes}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      <div className="space-y-6">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-3">
              Overdue ({overdue.length})
            </h4>
            <div className="space-y-3">{overdue.map(renderFollowUp)}</div>
          </div>
        )}

        {/* Due Today */}
        {today.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-orange-600 mb-3">
              Due Today ({today.length})
            </h4>
            <div className="space-y-3">{today.map(renderFollowUp)}</div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Upcoming ({upcoming.length})
            </h4>
            <div className="space-y-3">{upcoming.map(renderFollowUp)}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
