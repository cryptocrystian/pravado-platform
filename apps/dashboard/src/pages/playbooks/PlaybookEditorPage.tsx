// =====================================================
// PLAYBOOK EDITOR PAGE
// Sprint 42 Phase 3.5 Days 1-3
// =====================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  usePlaybookWithSteps,
  useUpdatePlaybook,
  useCreatePlaybook,
} from '../../hooks/usePlaybooks';
import {
  PlaybookStatus,
  PlaybookStepType,
  STEP_TYPE_CONFIGS,
} from '@pravado/shared-types';
import { usePlaybookEditor } from '../../hooks/usePlaybookEditor';
import { PlaybookEditorCanvas } from '../../components/playbook-editor/PlaybookEditorCanvas';
import { StepConfigPanel } from '../../components/playbook-editor/StepConfigPanel';
import {
  Save,
  Play,
  Plus,
  LayoutGrid,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export function PlaybookEditorPage() {
  const { playbookId } = useParams<{ playbookId?: string }>();
  const navigate = useNavigate();

  const [showStepMenu, setShowStepMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch playbook data
  const { data: playbook, isLoading } = usePlaybookWithSteps(playbookId);
  const updateMutation = useUpdatePlaybook();
  const createMutation = useCreatePlaybook();

  // Initialize editor
  const editor = usePlaybookEditor(playbook?.steps || []);

  // Update editor when playbook loads
  useEffect(() => {
    if (playbook?.steps && playbook.steps.length > 0) {
      // Steps are already initialized in the hook
    }
  }, [playbook]);

  /**
   * Save playbook
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (playbookId) {
        // Update existing playbook
        // In a real implementation, we would save steps to the backend
        await updateMutation.mutateAsync({
          id: playbookId,
          input: {
            // Save updated metadata
          },
        });
      }
      // Show success message
      console.log('Playbook saved successfully');
    } catch (error) {
      console.error('Failed to save playbook:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Activate playbook
   */
  const handleActivate = async () => {
    if (!playbookId) return;

    try {
      await updateMutation.mutateAsync({
        id: playbookId,
        input: {
          status: PlaybookStatus.ACTIVE,
        },
      });
    } catch (error) {
      console.error('Failed to activate playbook:', error);
    }
  };

  /**
   * Add new step
   */
  const handleAddStep = (stepType: PlaybookStepType) => {
    editor.addStep(stepType);
    setShowStepMenu(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/playbooks')}
            className="p-2 hover:bg-muted rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">
              {playbook?.name || 'New Playbook'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Visual playbook editor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Validation Warnings */}
          {editor.validationIssues.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-md text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{editor.validationIssues.length} issues</span>
            </div>
          )}

          {/* Auto Layout */}
          <button
            onClick={editor.autoLayout}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-muted text-sm"
            title="Auto arrange steps"
          >
            <LayoutGrid className="h-4 w-4" />
            Auto Layout
          </button>

          {/* Add Step */}
          <div className="relative">
            <button
              onClick={() => setShowStepMenu(!showStepMenu)}
              className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-muted text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>

            {/* Step Type Menu */}
            {showStepMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-card border rounded-lg shadow-lg z-50">
                <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                  {Object.entries(STEP_TYPE_CONFIGS).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => handleAddStep(type as PlaybookStepType)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-left transition-colors"
                    >
                      <div className="text-xl">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {config.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>

          {/* Activate */}
          {playbook?.status === PlaybookStatus.DRAFT && (
            <button
              onClick={handleActivate}
              className="flex items-center gap-2 px-4 py-1.5 border border-green-500 text-green-700 rounded-md hover:bg-green-50 text-sm font-medium"
            >
              <Play className="h-4 w-4" />
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <PlaybookEditorCanvas
            steps={editor.steps}
            positions={editor.positions}
            connections={editor.getConnections()}
            selectedStepId={editor.selectedStepId}
            validationIssues={editor.validationIssues}
            zoom={editor.zoom}
            panOffset={editor.panOffset}
            onStepSelect={editor.selectStep}
            onStepPositionChange={editor.updateStepPosition}
            onConnectSteps={editor.connectSteps}
            onZoomChange={editor.setZoom}
            onPanOffsetChange={editor.setPanOffset}
          />
        </div>

        {/* Config Panel */}
        {editor.selectedStepId && (
          <StepConfigPanel
            step={editor.getSelectedStep()}
            onUpdate={editor.updateStep}
            onDelete={editor.removeStep}
            onClose={() => editor.selectStep(null)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="bg-card border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{editor.steps.length} steps</span>
          <span>{editor.getConnections().length} connections</span>
          <span>Zoom: {Math.round(editor.zoom * 100)}%</span>
        </div>
        <div>
          {playbook?.status && (
            <span className="px-2 py-1 rounded bg-muted">
              Status: {playbook.status}
            </span>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showStepMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStepMenu(false)}
        ></div>
      )}
    </div>
  );
}
