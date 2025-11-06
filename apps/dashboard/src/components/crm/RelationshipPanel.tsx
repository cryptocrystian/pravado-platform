'use client';

import { useState } from 'react';
import {
  useRelationship,
  useCreateRelationship,
  useUpdateRelationship,
} from '../../hooks/useCRM';
import { RelationshipType } from '@pravado/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface RelationshipPanelProps {
  contactId: string;
  organizationId: string;
}

export function RelationshipPanel({ contactId, organizationId }: RelationshipPanelProps) {
  const { data: relationship, isLoading } = useRelationship(contactId);
  const createRelationship = useCreateRelationship();
  const updateRelationship = useUpdateRelationship();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(RelationshipType.WATCHER);
  const [priorityLevel, setPriorityLevel] = useState(0);

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }

  const getTemperatureColor = (temperature: string) => {
    switch (temperature) {
      case 'Hot':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Warm':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Cool':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStrengthColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleCreateRelationship = async () => {
    await createRelationship.mutateAsync({
      contactId,
      organizationId,
      relationshipType: RelationshipType.WATCHER,
      notes: '',
      priorityLevel: 0,
    });
  };

  const handleUpdateRelationship = async () => {
    if (!relationship) return;

    await updateRelationship.mutateAsync({
      contactId,
      data: {
        relationshipType,
        notes,
        priorityLevel,
      },
    });

    setIsEditing(false);
  };

  const startEdit = () => {
    if (relationship) {
      setRelationshipType(relationship.relationshipType);
      setNotes(relationship.notes || '');
      setPriorityLevel(relationship.priorityLevel);
      setIsEditing(true);
    }
  };

  // No relationship exists
  if (!relationship) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-gray-600 mb-4">
            No relationship established yet. Create a relationship to start tracking interactions.
          </div>
          <Button onClick={handleCreateRelationship} disabled={createRelationship.isPending}>
            {createRelationship.isPending ? 'Creating...' : 'Create Relationship'}
          </Button>
        </div>
      </Card>
    );
  }

  // Calculate relationship temperature manually for non-view data
  const getTemperature = () => {
    if (!relationship.lastInteractionAt) return 'Cold';
    const daysSince = Math.floor(
      (Date.now() - new Date(relationship.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 7) return 'Hot';
    if (daysSince <= 30) return 'Warm';
    if (daysSince <= 90) return 'Cool';
    return 'Cold';
  };

  const temperature = getTemperature();

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold">Relationship</h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Relationship Type</label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value={RelationshipType.OWNER}>Owner</option>
              <option value={RelationshipType.COLLABORATOR}>Collaborator</option>
              <option value={RelationshipType.WATCHER}>Watcher</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Priority Level (0-5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={priorityLevel}
              onChange={(e) => setPriorityLevel(parseInt(e.target.value))}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Add notes about this relationship..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdateRelationship} disabled={updateRelationship.isPending}>
              {updateRelationship.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Relationship Strength */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-gray-600">Relationship Strength</span>
              <span className={`text-2xl font-bold ${getStrengthColor(relationship.strengthScore)}`}>
                {relationship.strengthScore.toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStrengthColor(relationship.strengthScore)}`}
                style={{ width: `${relationship.strengthScore}%`, backgroundColor: 'currentColor' }}
              />
            </div>
          </div>

          {/* Temperature Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Temperature</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTemperatureColor(temperature)}`}>
              {temperature}
            </span>
          </div>

          {/* Interaction Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Interactions</span>
            <span className="text-sm font-medium">{relationship.interactionCount}</span>
          </div>

          {/* Last Interaction */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Interaction</span>
            <span className="text-sm font-medium">
              {relationship.lastInteractionAt
                ? new Date(relationship.lastInteractionAt).toLocaleDateString()
                : 'Never'}
            </span>
          </div>

          {/* Relationship Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Type</span>
            <span className="text-sm font-medium">{relationship.relationshipType}</span>
          </div>

          {/* Priority Level */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Priority</span>
            <span className="text-sm font-medium">
              {'⭐'.repeat(relationship.priorityLevel)}
              {relationship.priorityLevel === 0 && 'None'}
            </span>
          </div>

          {/* Notes */}
          {relationship.notes && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Notes</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{relationship.notes}</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
