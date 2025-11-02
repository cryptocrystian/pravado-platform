'use client';

import { useState } from 'react';
import { InteractionTimeline } from './InteractionTimeline';
import { RelationshipPanel } from './RelationshipPanel';
import { AddInteractionForm } from './AddInteractionForm';
import { Button } from '../ui/button';

interface ContactCRMTabProps {
  contactId: string;
  organizationId: string;
}

export function ContactCRMTab({ contactId, organizationId }: ContactCRMTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CRM & Relationships</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Log Interaction'}
        </Button>
      </div>

      {/* Add Interaction Form (Conditional) */}
      {showAddForm && (
        <AddInteractionForm
          contactId={contactId}
          organizationId={organizationId}
          onSuccess={() => setShowAddForm(false)}
        />
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Timeline (2/3 width) */}
        <div className="lg:col-span-2">
          <InteractionTimeline contactId={contactId} />
        </div>

        {/* Right Column - Relationship Panel (1/3 width) */}
        <div className="lg:col-span-1">
          <RelationshipPanel contactId={contactId} organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}
