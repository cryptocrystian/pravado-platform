// =====================================================
// STEP CONFIGURATION PANEL
// Sprint 42 Phase 3.5 Days 1-3
// =====================================================

import { useState, useEffect } from 'react';
import {
  PlaybookStep,
  PlaybookStepType,
  STEP_TYPE_CONFIGS,
} from '@pravado/shared-types';
import { X, Save, Trash2 } from 'lucide-react';

export interface StepConfigPanelProps {
  step: PlaybookStep | null;
  onUpdate: (stepId: string, updates: Partial<PlaybookStep>) => void;
  onDelete: (stepId: string) => void;
  onClose: () => void;
}

export function StepConfigPanel({
  step,
  onUpdate,
  onDelete,
  onClose,
}: StepConfigPanelProps) {
  const [stepName, setStepName] = useState('');
  const [description, setDescription] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(300);
  const [maxRetries, setMaxRetries] = useState(2);
  const [isOptional, setIsOptional] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});

  // Initialize form when step changes
  useEffect(() => {
    if (step) {
      setStepName(step.stepName);
      setDescription(step.description || '');
      setTimeoutSeconds(step.timeoutSeconds);
      setMaxRetries(step.maxRetries);
      setIsOptional(step.isOptional);
      setConfig(step.config || {});
    }
  }, [step]);

  if (!step) {
    return (
      <div className="w-96 bg-card border-l h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a step to configure</p>
      </div>
    );
  }

  const stepConfig = STEP_TYPE_CONFIGS[step.stepType];

  const handleSave = () => {
    onUpdate(step.id, {
      stepName,
      description,
      timeoutSeconds,
      maxRetries,
      isOptional,
      config,
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete step "${step.stepName}"?`)) {
      onDelete(step.id);
      onClose();
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="w-96 bg-card border-l h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{stepConfig?.icon}</div>
          <div>
            <h3 className="font-semibold text-sm">Configure Step</h3>
            <p className="text-xs text-muted-foreground">{stepConfig?.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Info */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Basic Information</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Step Name</label>
              <input
                type="text"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md"
                placeholder="e.g., Qualify Lead"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md"
                rows={3}
                placeholder="Describe what this step does..."
              />
            </div>
          </div>
        </div>

        {/* Step Configuration (Dynamic based on type) */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Step Configuration</h4>
          <StepTypeConfigForm
            stepType={step.stepType}
            config={config}
            onChange={handleConfigChange}
          />
        </div>

        {/* Execution Settings */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Execution Settings</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-md"
                min="1"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-md"
                min="0"
                max="10"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOptional"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isOptional" className="text-xs font-medium">
                Optional step (continue on failure)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
          title="Delete step"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Dynamic configuration form based on step type
 */
interface StepTypeConfigFormProps {
  stepType: PlaybookStepType;
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

function StepTypeConfigForm({ stepType, config, onChange }: StepTypeConfigFormProps) {
  switch (stepType) {
    case PlaybookStepType.AGENT_EXECUTION:
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Agent ID</label>
            <input
              type="text"
              value={config.agentId || ''}
              onChange={(e) => onChange('agentId', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              placeholder="agent-uuid"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Prompt</label>
            <textarea
              value={config.prompt || ''}
              onChange={(e) => onChange('prompt', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              rows={4}
              placeholder="Enter prompt template..."
            />
          </div>
        </div>
      );

    case PlaybookStepType.API_CALL:
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">URL</label>
            <input
              type="text"
              value={config.url || ''}
              onChange={(e) => onChange('url', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              placeholder="https://api.example.com/endpoint"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Method</label>
            <select
              value={config.method || 'GET'}
              onChange={(e) => onChange('method', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      );

    case PlaybookStepType.DATA_TRANSFORM:
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Transformation Type
            </label>
            <select
              value={config.transformationType || 'map'}
              onChange={(e) => onChange('transformationType', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            >
              <option value="map">Map Fields</option>
              <option value="filter">Filter Data</option>
              <option value="transform">Transform Values</option>
            </select>
          </div>
        </div>
      );

    case PlaybookStepType.CONDITIONAL_BRANCH:
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Condition Field</label>
            <input
              type="text"
              value={config.field || ''}
              onChange={(e) => onChange('field', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              placeholder="e.g., score"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Operator</label>
            <select
              value={config.operator || 'equals'}
              onChange={(e) => onChange('operator', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            >
              <option value="equals">Equals</option>
              <option value="notEquals">Not Equals</option>
              <option value="greaterThan">Greater Than</option>
              <option value="lessThan">Less Than</option>
              <option value="contains">Contains</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Value</label>
            <input
              type="text"
              value={config.value || ''}
              onChange={(e) => onChange('value', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              placeholder="Comparison value"
            />
          </div>
        </div>
      );

    case PlaybookStepType.MEMORY_SEARCH:
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Query</label>
            <textarea
              value={config.query || ''}
              onChange={(e) => onChange('query', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              rows={3}
              placeholder="Search query..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Result Limit</label>
            <input
              type="number"
              value={config.limit || 10}
              onChange={(e) => onChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border rounded-md"
              min="1"
              max="100"
            />
          </div>
        </div>
      );

    case PlaybookStepType.PROMPT_TEMPLATE:
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Template</label>
            <textarea
              value={config.template || ''}
              onChange={(e) => onChange('template', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              rows={5}
              placeholder="Use {variable} syntax for dynamic values"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="text-xs text-muted-foreground">
          <p>No specific configuration needed for this step type.</p>
          <p className="mt-2">
            You can configure general settings like timeout and retries above.
          </p>
        </div>
      );
  }
}
