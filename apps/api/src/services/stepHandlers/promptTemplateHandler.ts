// =====================================================
// PROMPT TEMPLATE HANDLER
// Core Infrastructure Days 3-6
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { PlaybookStep } from '@pravado/types';
import { StepExecutionContext } from './index';

/**
 * Handle PROMPT_TEMPLATE step type
 * Resolves prompt templates with variables
 */
export async function handlePromptTemplate(
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
): Promise<Record<string, any>> {
  const { template, variables = {} } = step.config;

  if (!template) {
    throw new Error('Template is required for PROMPT_TEMPLATE step');
  }

  console.log(`Resolving prompt template with ${Object.keys(variables).length} variables`);

  // Merge config variables with input variables
  const allVariables = {
    ...variables,
    ...input,
    ...context.executionData,
  };

  // Resolve template
  const resolvedPrompt = resolveTemplate(template, allVariables);

  return {
    success: true,
    template,
    resolvedPrompt,
    variablesUsed: Object.keys(allVariables).filter((key) => template.includes(`{${key}}`)),
  };
}

/**
 * Resolve template string with variables
 */
function resolveTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let resolved = template;

  // Replace {variable} patterns
  const matches = template.match(/\{([^}]+)\}/g);
  if (matches) {
    for (const match of matches) {
      const key = match.substring(1, match.length - 1);
      const value = getNestedValue(variables, key);

      if (value !== undefined) {
        resolved = resolved.replace(match, String(value));
      } else {
        console.warn(`Variable not found: ${key}`);
      }
    }
  }

  return resolved;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}
