'use client';

import { useState } from 'react';
import { useLogInteraction } from '../../hooks/useCRM';
import {
  InteractionType,
  InteractionDirection,
  InteractionChannel,
  InteractionSentiment,
} from '@pravado/shared-types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface AddInteractionFormProps {
  contactId: string;
  organizationId: string;
  onSuccess?: () => void;
}

export function AddInteractionForm({
  contactId,
  organizationId,
  onSuccess,
}: AddInteractionFormProps) {
  const logInteraction = useLogInteraction();

  const [interactionType, setInteractionType] = useState<InteractionType>(InteractionType.EMAIL);
  const [direction, setDirection] = useState<InteractionDirection>(InteractionDirection.OUTBOUND);
  const [channel, setChannel] = useState<InteractionChannel>(InteractionChannel.EMAIL);
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [sentiment, setSentiment] = useState<InteractionSentiment | ''>('');
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16) // Format for datetime-local input
  );
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await logInteraction.mutateAsync({
      contactId,
      organizationId,
      interactionType,
      direction,
      channel,
      subject: subject || undefined,
      notes: notes || undefined,
      outcome: outcome || undefined,
      sentiment: sentiment || undefined,
      occurredAt: new Date(occurredAt),
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
    });

    // Reset form
    setSubject('');
    setNotes('');
    setOutcome('');
    setSentiment('');
    setDurationMinutes('');
    setOccurredAt(new Date().toISOString().slice(0, 16));

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Log Interaction</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Interaction Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={interactionType}
              onChange={(e) => setInteractionType(e.target.value as InteractionType)}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value={InteractionType.EMAIL}>Email</option>
              <option value={InteractionType.CALL}>Call</option>
              <option value={InteractionType.MEETING}>Meeting</option>
              <option value={InteractionType.DM}>Direct Message</option>
              <option value={InteractionType.OTHER}>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as InteractionDirection)}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value={InteractionDirection.OUTBOUND}>Outbound</option>
              <option value={InteractionDirection.INBOUND}>Inbound</option>
            </select>
          </div>
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm font-medium mb-2">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as InteractionChannel)}
            className="w-full border rounded-md px-3 py-2"
            required
          >
            <option value={InteractionChannel.EMAIL}>Email</option>
            <option value={InteractionChannel.PHONE}>Phone</option>
            <option value={InteractionChannel.LINKEDIN}>LinkedIn</option>
            <option value={InteractionChannel.TWITTER}>Twitter</option>
            <option value={InteractionChannel.ZOOM}>Zoom</option>
            <option value={InteractionChannel.SLACK}>Slack</option>
            <option value={InteractionChannel.OTHER}>Other</option>
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Brief description of the interaction"
            maxLength={500}
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date & Time</label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Sentiment */}
        <div>
          <label className="block text-sm font-medium mb-2">Sentiment</label>
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as InteractionSentiment | '')}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Not specified</option>
            <option value={InteractionSentiment.POSITIVE}>Positive</option>
            <option value={InteractionSentiment.NEUTRAL}>Neutral</option>
            <option value={InteractionSentiment.NEGATIVE}>Negative</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Add details about the interaction..."
          />
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium mb-2">Outcome</label>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            className="w-full border rounded-md px-3 py-2"
            placeholder="What was the result or next step?"
          />
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={logInteraction.isPending} className="w-full">
          {logInteraction.isPending ? 'Logging...' : 'Log Interaction'}
        </Button>
      </form>
    </Card>
  );
}
