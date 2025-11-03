// =====================================================
// PLAYBOOK BUILDER UI
// Sprint 41 Phase 3.4 Days 3-6
// =====================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePlaybookWithSteps,
  useCreatePlaybook,
  useUpdatePlaybook,
} from '../../hooks/usePlaybooks';
import {
  PlaybookStatus,
  PlaybookStepType,
  STEP_TYPE_CONFIGS,
  PLAYBOOK_STATUS_CONFIGS,
} from '@pravado/shared-types';
import { Button } from '../../components/ui/button';
import { Loader2, Plus, Save, Play } from 'lucide-react';

export function PlaybookBuilder({ playbookId }: { playbookId?: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const { data: playbook, isLoading } = usePlaybookWithSteps(playbookId);
  const createMutation = useCreatePlaybook();
  const updateMutation = useUpdatePlaybook();

  // Initialize form when playbook loads
  useState(() => {
    if (playbook) {
      setName(playbook.name);
      setDescription(playbook.description || '');
      setCategory(playbook.category || '');
    }
  });

  const handleSave = async () => {
    if (!name) {
      alert('Please enter a playbook name');
      return;
    }

    try {
      if (playbookId && playbook) {
        // Update existing
        await updateMutation.mutateAsync({
          id: playbookId,
          input: { name, description, category },
        });
      } else {
        // Create new
        const newPlaybook = await createMutation.mutateAsync({
          name,
          description,
          category,
        });
        navigate(`/playbooks/${newPlaybook.id}/builder`);
      }
    } catch (error) {
      console.error('Failed to save playbook:', error);
    }
  };

  const handleActivate = async () => {
    if (!playbookId) return;

    try {
      await updateMutation.mutateAsync({
        id: playbookId,
        input: { status: PlaybookStatus.ACTIVE },
      });
    } catch (error) {
      console.error('Failed to activate playbook:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {playbookId ? 'Edit Playbook' : 'Create Playbook'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Build multi-step AI workflows with branching logic
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            {playbook && playbook.status === PlaybookStatus.DRAFT && (
              <Button onClick={handleActivate}>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Playbook Details */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Playbook Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., Lead Qualification Workflow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Describe what this playbook does..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., Sales, Marketing, Support"
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Workflow Steps</h2>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>

        {playbook && playbook.steps.length > 0 ? (
          <div className="space-y-3">
            {playbook.steps
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((step) => (
                <div key={step.id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {STEP_TYPE_CONFIGS[step.stepType]?.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{step.stepName}</div>
                      <div className="text-sm text-muted-foreground">
                        {STEP_TYPE_CONFIGS[step.stepType]?.label}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Step {step.stepOrder}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No steps yet. Click "Add Step" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
