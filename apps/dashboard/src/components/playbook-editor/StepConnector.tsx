// =====================================================
// STEP CONNECTOR COMPONENT
// Sprint 42 Phase 3.5 Days 1-3
// =====================================================

import { useMemo } from 'react';
import { StepConnection, StepPosition } from '../../hooks/usePlaybookEditor';

export interface StepConnectorProps {
  connection: StepConnection;
  fromPosition: StepPosition;
  toPosition: StepPosition;
  isSelected: boolean;
  onClick?: () => void;
}

/**
 * Renders an SVG arrow connecting two steps
 */
export function StepConnector({
  connection,
  fromPosition,
  toPosition,
  isSelected,
  onClick,
}: StepConnectorProps) {
  // Calculate arrow path
  const { path, markerEnd } = useMemo(() => {
    const nodeWidth = 280;
    const nodeHeight = 120;

    // Start point (right side of from node)
    const startX = fromPosition.x + nodeWidth;
    const startY = fromPosition.y + nodeHeight / 2;

    // End point (left side of to node)
    const endX = toPosition.x;
    const endY = toPosition.y + nodeHeight / 2;

    // Calculate control points for curved path
    const midX = (startX + endX) / 2;

    // Create curved path
    const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

    // Marker for arrowhead
    const markerId = `arrow-${connection.type}-${connection.fromStepId}-${connection.toStepId}`;

    return { path: pathData, markerEnd: `url(#${markerId})` };
  }, [fromPosition, toPosition, connection]);

  const strokeColor =
    connection.type === 'success'
      ? isSelected
        ? '#10b981'
        : '#86efac'
      : isSelected
        ? '#ef4444'
        : '#fca5a5';

  const strokeWidth = isSelected ? 3 : 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Arrowhead marker */}
        <marker
          id={`arrow-${connection.type}-${connection.fromStepId}-${connection.toStepId}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
        </marker>
      </defs>

      {/* Connection path */}
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        markerEnd={markerEnd}
        className={`transition-all ${onClick ? 'pointer-events-auto cursor-pointer hover:opacity-75' : ''}`}
        onClick={onClick}
      />

      {/* Connection label */}
      {isSelected && (
        <g>
          <text
            x={(fromPosition.x + 280 + toPosition.x) / 2}
            y={(fromPosition.y + toPosition.y) / 2 - 10}
            fill={strokeColor}
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            className="pointer-events-none"
          >
            {connection.type === 'success' ? '✓ On Success' : '✗ On Failure'}
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * Container for all step connectors
 */
export interface StepConnectorsProps {
  connections: StepConnection[];
  positions: Map<string, StepPosition>;
  selectedConnectionId?: string;
  onConnectionClick?: (connection: StepConnection) => void;
}

export function StepConnectors({
  connections,
  positions,
  selectedConnectionId,
  onConnectionClick,
}: StepConnectorsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {connections.map((connection) => {
        const fromPos = positions.get(connection.fromStepId);
        const toPos = positions.get(connection.toStepId);

        if (!fromPos || !toPos) return null;

        const connectionId = `${connection.fromStepId}-${connection.type}-${connection.toStepId}`;
        const isSelected = selectedConnectionId === connectionId;

        return (
          <StepConnector
            key={connectionId}
            connection={connection}
            fromPosition={fromPos}
            toPosition={toPos}
            isSelected={isSelected}
            onClick={
              onConnectionClick ? () => onConnectionClick(connection) : undefined
            }
          />
        );
      })}
    </div>
  );
}
