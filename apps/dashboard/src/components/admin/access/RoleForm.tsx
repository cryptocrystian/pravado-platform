// =====================================================
// ROLE FORM COMPONENT
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Alert,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { RoleDetails, AdminRole } from '@pravado/types';

export interface RoleFormProps {
  mode: 'create' | 'edit';
  existingRole?: RoleDetails;
  onSubmit: (roleData: RoleFormData) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}

export interface RoleFormData {
  roleName: string;
  displayName: string;
  description: string;
  isActive: boolean;
}

export const RoleForm: React.FC<RoleFormProps> = ({
  mode,
  existingRole,
  onSubmit,
  onCancel,
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    displayName: '',
    description: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && existingRole) {
      setFormData({
        roleName: existingRole.role,
        displayName: existingRole.displayName,
        description: existingRole.description || '',
        isActive: existingRole.isActive,
      });
    }
  }, [mode, existingRole]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.roleName.trim()) {
      newErrors.roleName = 'Role name is required';
    } else if (!/^[a-z_]+$/.test(formData.roleName)) {
      newErrors.roleName = 'Role name must be lowercase letters and underscores only';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      await onSubmit(formData);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof RoleFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isSystemRole = existingRole?.isSystemRole || false;
  const isEditingSystemRole = mode === 'edit' && isSystemRole;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {mode === 'create' ? 'Create New Role' : `Edit Role: ${existingRole?.displayName}`}
      </Typography>

      {isEditingSystemRole && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This is a system role. Modifications are restricted to maintain system integrity.
        </Alert>
      )}

      {readOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have read-only access. Only Super Admins can create or modify roles.
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box display="flex" flexDirection="column" gap={2.5}>
          <TextField
            label="Role Name"
            value={formData.roleName}
            onChange={(e) => handleChange('roleName', e.target.value)}
            error={!!errors.roleName}
            helperText={
              errors.roleName ||
              'Lowercase letters and underscores only (e.g., custom_admin)'
            }
            disabled={mode === 'edit' || readOnly}
            required
            fullWidth
          />

          <TextField
            label="Display Name"
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            error={!!errors.displayName}
            helperText={errors.displayName || 'Human-readable name shown in UI'}
            disabled={isEditingSystemRole || readOnly}
            required
            fullWidth
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={!!errors.description}
            helperText={
              errors.description || 'Describe the purpose and scope of this role'
            }
            disabled={isEditingSystemRole || readOnly}
            required
            multiline
            rows={4}
            fullWidth
          />

          <Divider />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                disabled={isEditingSystemRole || readOnly}
              />
            }
            label="Active"
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            Inactive roles cannot be assigned to users
          </Typography>

          <Divider />

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={submitting || readOnly || isEditingSystemRole}
            >
              {submitting
                ? 'Saving...'
                : mode === 'create'
                ? 'Create Role'
                : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </form>
    </Paper>
  );
};

export default RoleForm;
