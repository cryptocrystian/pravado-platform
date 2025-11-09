'use client';

// =====================================================
// AGENT RUNNER COMPONENT
// =====================================================
// Zod-driven form for agent execution

import { useState, useEffect } from 'react';
import { useAgentTemplate, useExecuteAgent, useAgentExecution } from '@/hooks/useAgents';
import { X, Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { z } from 'zod';

interface AgentRunnerProps {
  templateId: string;
  onClose: () => void;
}

export default function AgentRunner({ templateId, onClose }: AgentRunnerProps) {
  const { data: template, isLoading: templateLoading } = useAgentTemplate(templateId);
  const executeAgent = useExecuteAgent();
  const [executionId, setExecutionId] = useState<string | null>(null);
  const { data: executionData } = useAgentExecution(executionId);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template && template.exampleInput) {
      setFormData(template.exampleInput);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    try {
      // Validate input with Zod
      const schema = z.object(template.inputSchema as any);
      schema.parse(formData);

      // Execute agent
      const result = await executeAgent.mutateAsync({
        templateId: template.id,
        agentName: template.name,
        inputData: formData,
      });

      setExecutionId(result.execution.id);
      setErrors({});
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const renderFormField = (fieldName: string, fieldSchema: any) => {
    const value = formData[fieldName] || '';
    const error = errors[fieldName];
    const description = fieldSchema.description || '';

    // Handle different field types
    if (fieldSchema.type === 'array') {
      return (
        <div key={fieldName} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName}
            {!fieldSchema.optional && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
          <input
            type="text"
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => handleInputChange(fieldName, e.target.value.split(',').map((s) => s.trim()))}
            placeholder="Enter comma-separated values"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldSchema.type === 'number') {
      return (
        <div key={fieldName} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName}
            {!fieldSchema.optional && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(fieldName, parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldSchema.enum) {
      return (
        <div key={fieldName} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName}
            {!fieldSchema.optional && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
          <select
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select...</option>
            {fieldSchema.enum.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    // Default: text input
    return (
      <div key={fieldName} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {fieldName}
          {!fieldSchema.optional && <span className="text-red-500 ml-1">*</span>}
        </label>
        {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          placeholder={fieldSchema.placeholder || ''}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  };

  const execution = executionData?.execution;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{template?.name || 'Loading...'}</h2>
            <p className="text-sm text-gray-600">{template?.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {templateLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : execution ? (
            // Show execution status
            <div>
              {/* Status */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  {execution.status === 'PENDING' && (
                    <>
                      <Clock className="h-6 w-6 text-yellow-500" />
                      <span className="text-lg font-medium text-yellow-700">Pending...</span>
                    </>
                  )}
                  {execution.status === 'RUNNING' && (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="text-lg font-medium text-blue-700">Running...</span>
                    </>
                  )}
                  {execution.status === 'COMPLETED' && (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <span className="text-lg font-medium text-green-700">Completed</span>
                    </>
                  )}
                  {execution.status === 'FAILED' && (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <span className="text-lg font-medium text-red-700">Failed</span>
                    </>
                  )}
                </div>

                {/* Progress */}
                {execution.steps && execution.steps.length > 0 && (
                  <div className="space-y-2">
                    {execution.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                          {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          {step.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{step.name}</p>
                          {step.error && <p className="text-xs text-red-600">{step.error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Output */}
              {execution.outputData && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Output</h3>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(execution.outputData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {execution.errorMessage && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">Error</h3>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-800">{execution.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Reset Button */}
              <button
                onClick={() => {
                  setExecutionId(null);
                  setFormData(template?.exampleInput || {});
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Run Again
              </button>
            </div>
          ) : (
            // Show input form
            <form onSubmit={handleSubmit}>
              {template && Object.keys(template.inputSchema).map((fieldName) => {
                const fieldSchema = (template.inputSchema as any)[fieldName];
                return renderFormField(fieldName, fieldSchema);
              })}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={executeAgent.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {executeAgent.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Run Agent
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
