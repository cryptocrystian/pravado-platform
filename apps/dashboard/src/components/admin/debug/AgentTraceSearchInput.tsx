// =====================================================
// AGENT TRACE SEARCH INPUT COMPONENT
// Sprint 59 Phase 5.6
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import { Search, Clear, FilterList } from '@mui/icons-material';
import {
  TraceSeverity,
  TraceNodeType,
  TraceSearchFilters,
} from '@pravado/shared-types';

export interface AgentTraceSearchInputProps {
  onSearch: (filters: TraceSearchFilters) => void;
  loading?: boolean;
}

export const AgentTraceSearchInput: React.FC<AgentTraceSearchInputProps> = ({
  onSearch,
  loading = false,
}) => {
  const [query, setQuery] = useState('');
  const [agentId, setAgentId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [turnId, setTurnId] = useState('');
  const [severity, setSeverity] = useState<TraceSeverity | 'all'>('all');
  const [nodeType, setNodeType] = useState<TraceNodeType | 'all'>('all');
  const [hasErrors, setHasErrors] = useState<string>('all');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    const filters: TraceSearchFilters = {
      query: query || undefined,
      agentId: agentId || undefined,
      conversationId: conversationId || undefined,
      turnId: turnId || undefined,
      severity: severity !== 'all' ? severity : undefined,
      nodeType: nodeType !== 'all' ? nodeType : undefined,
      hasErrors: hasErrors === 'true' ? true : hasErrors === 'false' ? false : undefined,
      minDuration: minDuration ? parseInt(minDuration) : undefined,
      maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    onSearch(filters);
  };

  const handleClear = () => {
    setQuery('');
    setAgentId('');
    setConversationId('');
    setTurnId('');
    setSeverity('all');
    setNodeType('all');
    setHasErrors('all');
    setMinDuration('');
    setMaxDuration('');
    setTags([]);
    setTagInput('');
    onSearch({});
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (tagInput && showAdvanced) {
        handleAddTag();
      } else {
        handleSearch();
      }
    }
  };

  return (
    <Box>
      {/* Main Search Box */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          fullWidth
          placeholder="Search traces by keywords, agent ID, error messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
          }}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<Search />}
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
        <IconButton onClick={() => setShowAdvanced(!showAdvanced)} color="primary">
          <FilterList />
        </IconButton>
        {(query || agentId || conversationId || tags.length > 0) && (
          <IconButton onClick={handleClear} color="secondary">
            <Clear />
          </IconButton>
        )}
      </Box>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
          <Grid container spacing={2}>
            {/* Agent ID */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Agent ID"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Filter by agent ID"
                disabled={loading}
              />
            </Grid>

            {/* Conversation ID */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Conversation ID"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                placeholder="Filter by conversation"
                disabled={loading}
              />
            </Grid>

            {/* Turn ID */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Turn ID"
                value={turnId}
                onChange={(e) => setTurnId(e.target.value)}
                placeholder="Filter by turn"
                disabled={loading}
              />
            </Grid>

            {/* Severity */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as TraceSeverity | 'all')}
                  label="Severity"
                  disabled={loading}
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value={TraceSeverity.INFO}>Info</MenuItem>
                  <MenuItem value={TraceSeverity.WARNING}>Warning</MenuItem>
                  <MenuItem value={TraceSeverity.ERROR}>Error</MenuItem>
                  <MenuItem value={TraceSeverity.CRITICAL}>Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Node Type */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Node Type</InputLabel>
                <Select
                  value={nodeType}
                  onChange={(e) => setNodeType(e.target.value as TraceNodeType | 'all')}
                  label="Node Type"
                  disabled={loading}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value={TraceNodeType.SYSTEM_PROMPT}>System Prompt</MenuItem>
                  <MenuItem value={TraceNodeType.USER_INPUT}>User Input</MenuItem>
                  <MenuItem value={TraceNodeType.TOOL_CALL}>Tool Call</MenuItem>
                  <MenuItem value={TraceNodeType.FUNCTION_CALL}>Function Call</MenuItem>
                  <MenuItem value={TraceNodeType.MEMORY_FETCH}>Memory Fetch</MenuItem>
                  <MenuItem value={TraceNodeType.MEMORY_UPDATE}>Memory Update</MenuItem>
                  <MenuItem value={TraceNodeType.RESPONSE_GENERATION}>Response Generation</MenuItem>
                  <MenuItem value={TraceNodeType.ERROR_HANDLING}>Error Handling</MenuItem>
                  <MenuItem value={TraceNodeType.API_CALL}>API Call</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Has Errors */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Has Errors</InputLabel>
                <Select
                  value={hasErrors}
                  onChange={(e) => setHasErrors(e.target.value)}
                  label="Has Errors"
                  disabled={loading}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="true">With Errors</MenuItem>
                  <MenuItem value="false">Without Errors</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Duration Range */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Min Duration (ms)"
                value={minDuration}
                onChange={(e) => setMinDuration(e.target.value)}
                placeholder="e.g., 100"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Max Duration (ms)"
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                placeholder="e.g., 5000"
                disabled={loading}
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12} md={9}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  label="Add Tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Press Enter to add tag"
                  disabled={loading}
                />
                <Button variant="outlined" onClick={handleAddTag} disabled={loading || !tagInput.trim()}>
                  Add
                </Button>
              </Box>
              {tags.length > 0 && (
                <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      size="small"
                      color="primary"
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AgentTraceSearchInput;
