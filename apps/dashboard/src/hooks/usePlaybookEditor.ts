// =====================================================
// PLAYBOOK EDITOR HOOK
// Sprint 42 Phase 3.5 Days 1-3
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import {
  PlaybookStep,
  PlaybookStepType,
  CreatePlaybookStepInput,
  UpdatePlaybookStepInput,
} from '@pravado/types';

/**
 * Position of a step on the canvas
 */
export interface StepPosition {
  stepId: string;
  x: number;
  y: number;
}

/**
 * Visual connection between steps
 */
export interface StepConnection {
  fromStepId: string;
  toStepId: string;
  type: 'success' | 'failure';
}

/**
 * Validation issue for a step
 */
export interface ValidationIssue {
  stepId: string;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Editor state interface
 */
export interface PlaybookEditorState {
  steps: PlaybookStep[];
  positions: Map<string, StepPosition>;
  selectedStepId: string | null;
  draggingStepId: string | null;
  zoom: number;
  panOffset: { x: number; y: number };
  validationIssues: ValidationIssue[];
}

/**
 * Hook for managing playbook editor state
 */
export function usePlaybookEditor(initialSteps: PlaybookStep[] = []) {
  const [state, setState] = useState<PlaybookEditorState>({
    steps: initialSteps,
    positions: new Map(),
    selectedStepId: null,
    draggingStepId: null,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    validationIssues: [],
  });

  // Initialize positions for steps
  useEffect(() => {
    if (initialSteps.length > 0 && state.positions.size === 0) {
      const newPositions = new Map<string, StepPosition>();

      // Auto-layout steps in a vertical flow
      initialSteps
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .forEach((step, index) => {
          newPositions.set(step.id, {
            stepId: step.id,
            x: 400,
            y: 100 + index * 200,
          });
        });

      setState((prev) => ({
        ...prev,
        steps: initialSteps,
        positions: newPositions,
      }));
    }
  }, [initialSteps]);

  // Validate steps whenever they change
  useEffect(() => {
    const issues = validateSteps(state.steps, state.positions);
    setState((prev) => ({ ...prev, validationIssues: issues }));
  }, [state.steps, state.positions]);

  /**
   * Add a new step to the canvas
   */
  const addStep = useCallback((stepType: PlaybookStepType) => {
    const newStep: Partial<PlaybookStep> = {
      id: `temp-${Date.now()}`,
      stepName: `New ${stepType} Step`,
      stepType,
      stepOrder: state.steps.length + 1,
      config: {},
      inputSchema: {},
      outputSchema: {},
      inputMapping: {},
      timeoutSeconds: 300,
      maxRetries: 2,
      isOptional: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const position: StepPosition = {
      stepId: newStep.id!,
      x: 400,
      y: 100 + state.steps.length * 200,
    };

    setState((prev) => {
      const newPositions = new Map(prev.positions);
      newPositions.set(newStep.id!, position);

      return {
        ...prev,
        steps: [...prev.steps, newStep as PlaybookStep],
        positions: newPositions,
        selectedStepId: newStep.id!,
      };
    });
  }, [state.steps.length]);

  /**
   * Remove a step from the canvas
   */
  const removeStep = useCallback((stepId: string) => {
    setState((prev) => {
      const newPositions = new Map(prev.positions);
      newPositions.delete(stepId);

      return {
        ...prev,
        steps: prev.steps.filter((s) => s.id !== stepId),
        positions: newPositions,
        selectedStepId: prev.selectedStepId === stepId ? null : prev.selectedStepId,
      };
    });
  }, []);

  /**
   * Update step position
   */
  const updateStepPosition = useCallback((stepId: string, x: number, y: number) => {
    setState((prev) => {
      const newPositions = new Map(prev.positions);
      newPositions.set(stepId, { stepId, x, y });

      return {
        ...prev,
        positions: newPositions,
      };
    });
  }, []);

  /**
   * Update step configuration
   */
  const updateStep = useCallback((stepId: string, updates: Partial<PlaybookStep>) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    }));
  }, []);

  /**
   * Connect two steps
   */
  const connectSteps = useCallback(
    (fromStepId: string, toStepId: string, connectionType: 'success' | 'failure') => {
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((step) => {
          if (step.id === fromStepId) {
            return {
              ...step,
              ...(connectionType === 'success'
                ? { onSuccessStepId: toStepId }
                : { onFailureStepId: toStepId }),
            };
          }
          return step;
        }),
      }));
    },
    []
  );

  /**
   * Disconnect steps
   */
  const disconnectSteps = useCallback(
    (fromStepId: string, connectionType: 'success' | 'failure') => {
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((step) => {
          if (step.id === fromStepId) {
            return {
              ...step,
              ...(connectionType === 'success'
                ? { onSuccessStepId: undefined }
                : { onFailureStepId: undefined }),
            };
          }
          return step;
        }),
      }));
    },
    []
  );

  /**
   * Select a step
   */
  const selectStep = useCallback((stepId: string | null) => {
    setState((prev) => ({ ...prev, selectedStepId: stepId }));
  }, []);

  /**
   * Start dragging a step
   */
  const startDragging = useCallback((stepId: string) => {
    setState((prev) => ({ ...prev, draggingStepId: stepId }));
  }, []);

  /**
   * Stop dragging
   */
  const stopDragging = useCallback(() => {
    setState((prev) => ({ ...prev, draggingStepId: null }));
  }, []);

  /**
   * Set zoom level
   */
  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2, zoom)),
    }));
  }, []);

  /**
   * Set pan offset
   */
  const setPanOffset = useCallback((x: number, y: number) => {
    setState((prev) => ({ ...prev, panOffset: { x, y } }));
  }, []);

  /**
   * Auto-layout steps
   */
  const autoLayout = useCallback(() => {
    const newPositions = new Map<string, StepPosition>();

    // Simple vertical layout based on step order
    const sortedSteps = [...state.steps].sort((a, b) => a.stepOrder - b.stepOrder);

    sortedSteps.forEach((step, index) => {
      newPositions.set(step.id, {
        stepId: step.id,
        x: 400,
        y: 100 + index * 200,
      });
    });

    setState((prev) => ({
      ...prev,
      positions: newPositions,
    }));
  }, [state.steps]);

  /**
   * Get connections for rendering
   */
  const getConnections = useCallback((): StepConnection[] => {
    const connections: StepConnection[] = [];

    state.steps.forEach((step) => {
      if (step.onSuccessStepId) {
        connections.push({
          fromStepId: step.id,
          toStepId: step.onSuccessStepId,
          type: 'success',
        });
      }
      if (step.onFailureStepId) {
        connections.push({
          fromStepId: step.id,
          toStepId: step.onFailureStepId,
          type: 'failure',
        });
      }
    });

    return connections;
  }, [state.steps]);

  /**
   * Get selected step
   */
  const getSelectedStep = useCallback((): PlaybookStep | null => {
    if (!state.selectedStepId) return null;
    return state.steps.find((s) => s.id === state.selectedStepId) || null;
  }, [state.selectedStepId, state.steps]);

  return {
    // State
    steps: state.steps,
    positions: state.positions,
    selectedStepId: state.selectedStepId,
    draggingStepId: state.draggingStepId,
    zoom: state.zoom,
    panOffset: state.panOffset,
    validationIssues: state.validationIssues,

    // Actions
    addStep,
    removeStep,
    updateStep,
    updateStepPosition,
    connectSteps,
    disconnectSteps,
    selectStep,
    startDragging,
    stopDragging,
    setZoom,
    setPanOffset,
    autoLayout,

    // Helpers
    getConnections,
    getSelectedStep,
  };
}

/**
 * Validate steps and return issues
 */
function validateSteps(
  steps: PlaybookStep[],
  positions: Map<string, StepPosition>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for unpositioned steps
  steps.forEach((step) => {
    if (!positions.has(step.id)) {
      issues.push({
        stepId: step.id,
        severity: 'error',
        message: 'Step has no position on canvas',
      });
    }
  });

  // Check for disconnected steps (no incoming or outgoing connections)
  steps.forEach((step) => {
    const hasOutgoing = step.onSuccessStepId || step.onFailureStepId;
    const hasIncoming = steps.some(
      (s) => s.onSuccessStepId === step.id || s.onFailureStepId === step.id
    );

    if (!hasOutgoing && !hasIncoming && steps.length > 1) {
      issues.push({
        stepId: step.id,
        severity: 'warning',
        message: 'Step is not connected to any other steps',
      });
    }
  });

  // Check for missing configuration
  steps.forEach((step) => {
    if (!step.config || Object.keys(step.config).length === 0) {
      issues.push({
        stepId: step.id,
        severity: 'warning',
        message: 'Step configuration is empty',
      });
    }
  });

  // Check for circular references
  steps.forEach((step) => {
    if (hasCircularReference(step.id, step, steps)) {
      issues.push({
        stepId: step.id,
        severity: 'error',
        message: 'Circular reference detected',
      });
    }
  });

  return issues;
}

/**
 * Check if a step has a circular reference
 */
function hasCircularReference(
  startId: string,
  currentStep: PlaybookStep,
  allSteps: PlaybookStep[],
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(currentStep.id)) {
    return currentStep.id === startId;
  }

  visited.add(currentStep.id);

  const successStep = allSteps.find((s) => s.id === currentStep.onSuccessStepId);
  const failureStep = allSteps.find((s) => s.id === currentStep.onFailureStepId);

  if (successStep && hasCircularReference(startId, successStep, allSteps, new Set(visited))) {
    return true;
  }

  if (failureStep && hasCircularReference(startId, failureStep, allSteps, new Set(visited))) {
    return true;
  }

  return false;
}
