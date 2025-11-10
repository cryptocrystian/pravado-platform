// =====================================================
// CUSTOM FUNCTION HANDLER
// Core Infrastructure Days 3-6
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { PlaybookStep } from '@pravado/types';
import { StepExecutionContext } from './index';

/**
 * Handle CUSTOM_FUNCTION step type
 * Executes custom JavaScript/TypeScript functions
 */
export async function handleCustomFunction(
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
): Promise<Record<string, any>> {
  const { functionName, code, parameters = {} } = step.config;

  if (!functionName && !code) {
    throw new Error('Either functionName or code is required for CUSTOM_FUNCTION step');
  }

  console.log(`Executing custom function: ${functionName || 'inline'}`);

  try {
    let result: any;

    if (functionName) {
      // Execute predefined function
      result = await executePredefinedFunction(functionName, {
        ...parameters,
        ...input,
      }, context);
    } else if (code) {
      // Execute inline code (sandboxed)
      result = await executeInlineCode(code, {
        ...parameters,
        ...input,
      }, context);
    }

    return {
      success: true,
      functionName: functionName || 'inline',
      result,
    };
  } catch (error: any) {
    console.error(`Custom function execution failed:`, error);

    return {
      success: false,
      error: error.message,
      errorStack: error.stack,
    };
  }
}

/**
 * Execute predefined function by name
 */
async function executePredefinedFunction(
  functionName: string,
  parameters: Record<string, any>,
  context: StepExecutionContext
): Promise<any> {
  // Registry of predefined functions
  const functions: Record<string, Function> = {
    // String operations
    concatenate: (params: any) => {
      const { values, separator = '' } = params;
      return Array.isArray(values) ? values.join(separator) : '';
    },

    // Array operations
    filterArray: (params: any) => {
      const { array, field, operator, value } = params;
      if (!Array.isArray(array)) return [];

      return array.filter((item) => {
        const itemValue = item[field];
        switch (operator) {
          case 'equals': return itemValue === value;
          case 'greaterThan': return itemValue > value;
          case 'lessThan': return itemValue < value;
          case 'contains': return String(itemValue).includes(value);
          default: return true;
        }
      });
    },

    // Math operations
    sum: (params: any) => {
      const { values } = params;
      return Array.isArray(values) ? values.reduce((a, b) => a + b, 0) : 0;
    },

    average: (params: any) => {
      const { values } = params;
      if (!Array.isArray(values) || values.length === 0) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    },

    // Date operations
    formatDate: (params: any) => {
      const { date, format = 'ISO' } = params;
      const dateObj = new Date(date);

      if (format === 'ISO') {
        return dateObj.toISOString();
      } else if (format === 'short') {
        return dateObj.toLocaleDateString();
      } else if (format === 'long') {
        return dateObj.toLocaleString();
      }

      return dateObj.toString();
    },

    // JSON operations
    parseJSON: (params: any) => {
      const { jsonString } = params;
      return JSON.parse(jsonString);
    },

    stringifyJSON: (params: any) => {
      const { data, pretty = false } = params;
      return JSON.stringify(data, null, pretty ? 2 : 0);
    },

    // Data extraction
    extractFields: (params: any) => {
      const { data, fields } = params;
      const result: Record<string, any> = {};

      for (const field of fields) {
        if (data[field] !== undefined) {
          result[field] = data[field];
        }
      }

      return result;
    },
  };

  const func = functions[functionName];
  if (!func) {
    throw new Error(`Function not found: ${functionName}`);
  }

  return await func(parameters);
}

/**
 * Execute inline code in a sandboxed environment
 * WARNING: In production, this should use a proper sandboxing solution
 */
async function executeInlineCode(
  code: string,
  parameters: Record<string, any>,
  context: StepExecutionContext
): Promise<any> {
  console.warn('Inline code execution is not recommended in production');

  // Create sandboxed context
  const sandbox = {
    ...parameters,
    context,
    console: {
      log: (...args: any[]) => console.log('[Sandbox]', ...args),
      error: (...args: any[]) => console.error('[Sandbox]', ...args),
      warn: (...args: any[]) => console.warn('[Sandbox]', ...args),
    },
  };

  // Execute code (THIS IS NOT SECURE - use proper sandboxing in production)
  const func = new Function('sandbox', `
    with (sandbox) {
      return (async function() {
        ${code}
      })();
    }
  `);

  return await func(sandbox);
}
