// =====================================================
// PLAYBOOK STEP NODE COMPONENT
// Sprint 42 Phase 3.5 Days 1-3
// =====================================================

import { useMemo } from 'react';
import { PlaybookStep, STEP_TYPE_CONFIGS } from '@pravado/types';
import { AlertCircle, CheckCircle2, XCircle, Grip } from 'lucide-react';
import { ValidationIssue } from '../../hooks/usePlaybookEditor';

export interface PlaybookStepNodeProps {
  step: PlaybookStep;
  x: number;
  y: number;
  isSelected: boolean;
  isDragging: boolean;
  validationIssues: ValidationIssue[];
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
  onConnectSuccess: () => void;
  onConnectFailure: () => void;
}

export function PlaybookStepNode({
  step,
  x,
  y,
  isSelected,
  isDragging,
  validationIssues,
  onSelect,
  onDragStart,
  onDragEnd,
  onConnectSuccess,
  onConnectFailure,
}: PlaybookStepNodeProps) {
  const stepConfig = STEP_TYPE_CONFIGS[step.stepType];

  // Get validation issues for this step
  const stepIssues = useMemo(
    () => validationIssues.filter((issue) => issue.stepId === step.id),
    [validationIssues, step.id]
  );

  const hasErrors = stepIssues.some((issue) => issue.severity === 'error');
  const hasWarnings = stepIssues.some((issue) => issue.severity === 'warning');

  return (
    <div
      className={`absolute transition-all ${isDragging ? 'cursor-grabbing opacity-50' : 'cursor-pointer'}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: '280px',
      }}
      onClick={onSelect}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      role="button"
      aria-label={`${step.stepName} - ${stepConfig?.label}`}
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Main Step Card */}
      <div
        className={`bg-card rounded-lg border-2 shadow-md hover:shadow-lg transition-all ${
          isSelected
            ? 'border-primary ring-2 ring-primary ring-opacity-50'
            : hasErrors
              ? 'border-red-500'
              : hasWarnings
                ? 'border-yellow-500'
                : 'border-border hover:border-primary'
        }`}
      >
        {/* Header */}
        <div
          className="p-3 border-b flex items-center gap-3"
          style={{ backgroundColor: `var(--color-${stepConfig?.color || 'blue'}-50)` }}
        >
          <Grip className="h-4 w-4 text-muted-foreground cursor-grab" />
          <div className="text-2xl">{stepConfig?.icon || '📦'}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{step.stepName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {stepConfig?.label || step.stepType}
            </div>
          </div>
          {stepIssues.length > 0 && (
            <div className="flex items-center gap-1">
              {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
              {!hasErrors && hasWarnings && <AlertCircle className="h-4 w-4 text-yellow-500" />}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          {/* Step Order */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Step Order:</span>
            <span className="font-medium">{step.stepOrder}</span>
          </div>

          {/* Optional Badge */}
          {step.isOptional && (
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
              Optional
            </div>
          )}

          {/* Timeout */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Timeout:</span>
            <span className="font-medium">{step.timeoutSeconds}s</span>
          </div>

          {/* Validation Issues */}
          {stepIssues.length > 0 && (
            <div className="mt-2 space-y-1">
              {stepIssues.map((issue, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded ${
                    issue.severity === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Connection Points */}
        <div className="border-t p-2 flex items-center justify-between bg-muted/30">
          {/* Success Connection Point */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnectSuccess();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-green-100 hover:text-green-700 transition-colors"
            title="Connect on success"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Success</span>
            {step.onSuccessStepId && (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            )}
          </button>

          {/* Failure Connection Point */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnectFailure();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
            title="Connect on failure"
          >
            <XCircle className="h-3 w-3" />
            <span>Failure</span>
            {step.onFailureStepId && (
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
            )}
          </button>
        </div>
      </div>

      {/* Connection Handles (invisible clickable areas) */}
      <div
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform"
        onClick={(e) => {
          e.stopPropagation();
          onConnectSuccess();
        }}
        title="Success connection point"
      ></div>

      <div
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md"
        title="Incoming connection point"
      ></div>
    </div>
  );
}
