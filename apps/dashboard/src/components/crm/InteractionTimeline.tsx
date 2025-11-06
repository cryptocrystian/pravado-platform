'use client';

import { useState } from 'react';
import { useContactInteractions, useDeleteInteraction } from '../../hooks/useCRM';
import { ContactInteraction, InteractionSentiment } from '@pravado/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface InteractionTimelineProps {
  contactId: string;
  limit?: number;
}

export function InteractionTimeline({ contactId, limit = 50 }: InteractionTimelineProps) {
  const { data: interactions, isLoading } = useContactInteractions(contactId, limit);
  const deleteInteraction = useDeleteInteraction();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (!interactions || interactions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          No interactions recorded yet. Log your first interaction to start tracking your relationship.
        </div>
      </Card>
    );
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return '📧';
      case 'CALL':
        return '📞';
      case 'MEETING':
        return '🤝';
      case 'DM':
        return '💬';
      default:
        return '📝';
    }
  };

  const getSentimentColor = (sentiment: InteractionSentiment | null) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'bg-green-100 text-green-800';
      case 'NEUTRAL':
        return 'bg-gray-100 text-gray-800';
      case 'NEGATIVE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'INBOUND' ? (
      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">←  Inbound</span>
    ) : (
      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">→ Outbound</span>
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this interaction?')) {
      await deleteInteraction.mutateAsync(id);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Interaction History</h3>

      <div className="space-y-4">
        {interactions.map((interaction) => {
          const isExpanded = expandedId === interaction.id;

          return (
            <div
              key={interaction.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getInteractionIcon(interaction.interactionType)}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{interaction.subject || 'No Subject'}</h4>
                      {getDirectionBadge(interaction.direction)}
                      {interaction.sentiment && (
                        <span className={`text-xs px-2 py-1 rounded ${getSentimentColor(interaction.sentiment)}`}>
                          {interaction.sentiment}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {interaction.interactionType} via {interaction.channel} • {' '}
                      {formatDistanceToNow(new Date(interaction.occurredAt), { addSuffix: true })}
                      {interaction.durationMinutes && (
                        <span> • {interaction.durationMinutes} min</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : interaction.id)}
                  >
                    {isExpanded ? 'Hide' : 'Details'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(interaction.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {interaction.notes && (
                    <div>
                      <div className="text-sm font-medium mb-1">Notes</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {interaction.notes}
                      </div>
                    </div>
                  )}

                  {interaction.outcome && (
                    <div>
                      <div className="text-sm font-medium mb-1">Outcome</div>
                      <div className="text-sm text-gray-700">{interaction.outcome}</div>
                    </div>
                  )}

                  {interaction.externalLinks && interaction.externalLinks.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Links</div>
                      <div className="space-y-1">
                        {interaction.externalLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline block"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {interaction.relatedCampaignId && (
                    <div className="text-xs text-gray-500">
                      Related to campaign: {interaction.relatedCampaignId}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
