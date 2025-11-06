// =====================================================
// PLAYBOOK EDITOR CANVAS COMPONENT
// Sprint 42 Phase 3.5 Days 1-3
// =====================================================

import { useRef, useState, useCallback, useEffect } from 'react';
import { PlaybookStep } from '@pravado/types';
import {
  StepPosition,
  StepConnection,
  ValidationIssue,
} from '../../hooks/usePlaybookEditor';
import { PlaybookStepNode } from './PlaybookStepNode';
import { StepConnectors } from './StepConnector';

export interface PlaybookEditorCanvasProps {
  steps: PlaybookStep[];
  positions: Map<string, StepPosition>;
  connections: StepConnection[];
  selectedStepId: string | null;
  validationIssues: ValidationIssue[];
  zoom: number;
  panOffset: { x: number; y: number };
  onStepSelect: (stepId: string | null) => void;
  onStepPositionChange: (stepId: string, x: number, y: number) => void;
  onConnectSteps: (fromId: string, toId: string, type: 'success' | 'failure') => void;
  onZoomChange: (zoom: number) => void;
  onPanOffsetChange: (x: number, y: number) => void;
}

export function PlaybookEditorCanvas({
  steps,
  positions,
  connections,
  selectedStepId,
  validationIssues,
  zoom,
  panOffset,
  onStepSelect,
  onStepPositionChange,
  onConnectSteps,
  onZoomChange,
  onPanOffsetChange,
}: PlaybookEditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    stepId: string;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const [connecting, setConnecting] = useState<{
    fromStepId: string;
    type: 'success' | 'failure';
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  /**
   * Handle mouse down on step (start dragging)
   */
  const handleStepDragStart = useCallback(
    (stepId: string, e: React.MouseEvent) => {
      e.stopPropagation();

      const pos = positions.get(stepId);
      if (!pos) return;

      setDragging({
        stepId,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: pos.x,
        startPosY: pos.y,
      });

      onStepSelect(stepId);
    },
    [positions, onStepSelect]
  );

  /**
   * Handle mouse move (dragging)
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging) {
        const deltaX = (e.clientX - dragging.startX) / zoom;
        const deltaY = (e.clientY - dragging.startY) / zoom;

        const newX = Math.max(0, dragging.startPosX + deltaX);
        const newY = Math.max(0, dragging.startPosY + deltaY);

        // Snap to grid (20px grid)
        const snappedX = Math.round(newX / 20) * 20;
        const snappedY = Math.round(newY / 20) * 20;

        onStepPositionChange(dragging.stepId, snappedX, snappedY);
      } else if (isPanning) {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;

        onPanOffsetChange(panOffset.x + deltaX, panOffset.y + deltaY);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [dragging, isPanning, panStart, zoom, panOffset, onStepPositionChange, onPanOffsetChange]
  );

  /**
   * Handle mouse up (stop dragging)
   */
  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
    setConnecting(null);
  }, []);

  /**
   * Handle canvas click (deselect)
   */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onStepSelect(null);
      }
    },
    [onStepSelect]
  );

  /**
   * Handle wheel (zoom)
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY / 1000;
        onZoomChange(zoom + delta);
      }
    },
    [zoom, onZoomChange]
  );

  /**
   * Handle canvas pan (space + drag)
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.spaceKey) {
      // Middle mouse button or space key
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  /**
   * Start connecting steps
   */
  const handleStartConnection = useCallback(
    (fromStepId: string, type: 'success' | 'failure') => {
      setConnecting({ fromStepId, type });
    },
    []
  );

  /**
   * Complete connection
   */
  const handleCompleteConnection = useCallback(
    (toStepId: string) => {
      if (connecting && connecting.fromStepId !== toStepId) {
        onConnectSteps(connecting.fromStepId, toStepId, connecting.type);
      }
      setConnecting(null);
    },
    [connecting, onConnectSteps]
  );

  // Setup event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected step
      if (e.key === 'Delete' && selectedStepId) {
        // Would call onDeleteStep if we had that prop
        console.log('Delete step:', selectedStepId);
      }

      // Zoom controls
      if (e.key === '=' || e.key === '+') {
        onZoomChange(zoom + 0.1);
      } else if (e.key === '-' || e.key === '_') {
        onZoomChange(zoom - 0.1);
      } else if (e.key === '0') {
        onZoomChange(1);
        onPanOffsetChange(0, 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedStepId, zoom, onZoomChange, onPanOffsetChange]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-gray-50"
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      style={{
        cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'default',
      }}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      ></div>

      {/* Canvas Content - Drag to rearrange steps */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Step Connectors */}
        <StepConnectors connections={connections} positions={positions} />

        {/* Step Nodes */}
        {steps.map((step) => {
          const pos = positions.get(step.id);
          if (!pos) return null;

          return (
            <PlaybookStepNode
              key={step.id}
              step={step}
              x={pos.x}
              y={pos.y}
              isSelected={selectedStepId === step.id}
              isDragging={dragging?.stepId === step.id}
              validationIssues={validationIssues}
              onSelect={() => onStepSelect(step.id)}
              onDragStart={(e) => handleStepDragStart(step.id, e)}
              onDragEnd={handleMouseUp}
              onConnectSuccess={() => handleStartConnection(step.id, 'success')}
              onConnectFailure={() => handleStartConnection(step.id, 'failure')}
            />
          );
        })}

        {/* Connection Preview */}
        {connecting && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="text-center p-4 bg-primary/10 border border-primary rounded-lg">
                <p className="text-sm font-medium">
                  Click on another step to connect on {connecting.type}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-card rounded-lg border shadow-lg p-2">
        <button
          onClick={() => onZoomChange(zoom + 0.1)}
          className="px-3 py-1 hover:bg-muted rounded text-sm font-medium"
          title="Zoom in (+)"
        >
          +
        </button>
        <div className="text-xs text-center text-muted-foreground font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => onZoomChange(zoom - 0.1)}
          className="px-3 py-1 hover:bg-muted rounded text-sm font-medium"
          title="Zoom out (-)"
        >
          −
        </button>
        <button
          onClick={() => {
            onZoomChange(1);
            onPanOffsetChange(0, 0);
          }}
          className="px-3 py-1 hover:bg-muted rounded text-xs font-medium"
          title="Reset (0)"
        >
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-card rounded-lg border shadow-lg p-3 max-w-sm">
        <h3 className="font-semibold text-sm mb-2">Canvas Controls</h3>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Drag steps to move them</li>
          <li>• Click success/failure buttons to connect steps</li>
          <li>• Ctrl + Scroll to zoom</li>
          <li>• +/- keys to zoom, 0 to reset</li>
          <li>• Click canvas to deselect</li>
        </ul>
      </div>
    </div>
  );
}
