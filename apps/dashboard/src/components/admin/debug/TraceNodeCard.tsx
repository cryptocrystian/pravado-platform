// =====================================================
// TRACE NODE CARD COMPONENT
// Sprint 59 Phase 5.6
// =====================================================

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Collapse,
  IconButton,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle,
} from '@mui/icons-material';
import { TraceNode, TraceSeverity, TraceNodeType } from '@pravado/shared-types';

export interface TraceNodeCardProps {
  node: TraceNode;
  depth?: number;
}

export const TraceNodeCard: React.FC<TraceNodeCardProps> = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [childrenExpanded, setChildrenExpanded] = useState(false);

  const getSeverityColor = (severity: TraceSeverity) => {
    switch (severity) {
      case TraceSeverity.CRITICAL:
      case TraceSeverity.ERROR:
        return 'error';
      case TraceSeverity.WARNING:
        return 'warning';
      case TraceSeverity.INFO:
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity: TraceSeverity) => {
    switch (severity) {
      case TraceSeverity.CRITICAL:
      case TraceSeverity.ERROR:
        return <ErrorIcon fontSize="small" />;
      case TraceSeverity.WARNING:
        return <WarningIcon fontSize="small" />;
      case TraceSeverity.INFO:
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getNodeTypeColor = (nodeType: TraceNodeType) => {
    switch (nodeType) {
      case TraceNodeType.ERROR_HANDLING:
        return 'error';
      case TraceNodeType.TOOL_CALL:
      case TraceNodeType.FUNCTION_CALL:
      case TraceNodeType.API_CALL:
        return 'primary';
      case TraceNodeType.MEMORY_FETCH:
      case TraceNodeType.MEMORY_UPDATE:
        return 'secondary';
      case TraceNodeType.RESPONSE_GENERATION:
      case TraceNodeType.RESPONSE_RENDER:
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box sx={{ ml: depth * 3, mb: 1 }}>
      <Card
        variant="outlined"
        sx={{
          borderLeft: `4px solid`,
          borderLeftColor: `${getSeverityColor(node.severity)}.main`,
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* Header Row */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1} flex={1}>
              {getSeverityIcon(node.severity)}
              <Typography variant="subtitle2" fontWeight={600}>
                {node.label}
              </Typography>
              <Chip
                label={node.nodeType.replace(/_/g, ' ')}
                size="small"
                color={getNodeTypeColor(node.nodeType)}
                sx={{ textTransform: 'capitalize' }}
              />
              {node.duration !== undefined && (
                <Chip
                  label={formatDuration(node.duration)}
                  size="small"
                  variant="outlined"
                  icon={<CheckCircle fontSize="small" />}
                />
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={0.5}>
              {hasChildren && (
                <IconButton size="small" onClick={() => setChildrenExpanded(!childrenExpanded)}>
                  {childrenExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          </Box>

          {/* Expanded Details */}
          <Collapse in={expanded} timeout="auto">
            <Divider sx={{ my: 1.5 }} />

            {node.description && (
              <Typography variant="body2" color="text.secondary" paragraph>
                {node.description}
              </Typography>
            )}

            <Grid container spacing={2}>
              {/* Timing Information */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Start Time
                </Typography>
                <Typography variant="body2">
                  {new Date(node.startTime).toLocaleTimeString()}
                </Typography>
              </Grid>

              {node.endTime && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    End Time
                  </Typography>
                  <Typography variant="body2">
                    {new Date(node.endTime).toLocaleTimeString()}
                  </Typography>
                </Grid>
              )}

              {/* Severity */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Severity
                </Typography>
                <Box>
                  <Chip
                    label={node.severity.toUpperCase()}
                    size="small"
                    color={getSeverityColor(node.severity)}
                  />
                </Box>
              </Grid>

              {/* Node Type */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {node.nodeType.replace(/_/g, ' ')}
                </Typography>
              </Grid>
            </Grid>

            {/* Error Information */}
            {node.errorMessage && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Error Message</Typography>
                <Typography variant="body2">{node.errorMessage}</Typography>
                {node.stackTrace && (
                  <Box mt={1}>
                    <Typography variant="caption">Stack Trace:</Typography>
                    <pre
                      style={{
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: 200,
                        background: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                      }}
                    >
                      {node.stackTrace}
                    </pre>
                  </Box>
                )}
              </Alert>
            )}

            {/* Input Data */}
            {node.inputData && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Input Data
                </Typography>
                <pre
                  style={{
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 150,
                    background: '#f9f9f9',
                    padding: '8px',
                    borderRadius: '4px',
                  }}
                >
                  {JSON.stringify(node.inputData, null, 2)}
                </pre>
              </Box>
            )}

            {/* Output Data */}
            {node.outputData && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Output Data
                </Typography>
                <pre
                  style={{
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 150,
                    background: '#f9f9f9',
                    padding: '8px',
                    borderRadius: '4px',
                  }}
                >
                  {JSON.stringify(node.outputData, null, 2)}
                </pre>
              </Box>
            )}

            {/* Metadata */}
            {node.metadata && Object.keys(node.metadata).length > 0 && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Metadata
                </Typography>
                <pre
                  style={{
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 150,
                    background: '#f9f9f9',
                    padding: '8px',
                    borderRadius: '4px',
                  }}
                >
                  {JSON.stringify(node.metadata, null, 2)}
                </pre>
              </Box>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* Child Nodes */}
      {hasChildren && (
        <Collapse in={childrenExpanded} timeout="auto">
          <Box mt={1}>
            {node.children!.map((child, index) => (
              <TraceNodeCard key={child.nodeId || index} node={child} depth={depth + 1} />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default TraceNodeCard;
