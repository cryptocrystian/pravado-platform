// =====================================================
// DATA TRANSFORM HANDLER
// Core Infrastructure Days 3-6
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { PlaybookStep } from '@pravado/types';
import { StepExecutionContext } from './index';

/**
 * Handle DATA_TRANSFORM step type
 * Transforms data using specified operations
 */
export async function handleDataTransform(
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
): Promise<Record<string, any>> {
  const { operations, outputFormat } = step.config;

  if (!operations || !Array.isArray(operations)) {
    throw new Error('Operations array is required for DATA_TRANSFORM step');
  }

  console.log(`Transforming data with ${operations.length} operations`);

  let transformedData = { ...input };

  // Apply each transformation operation
  for (const operation of operations) {
    transformedData = await applyOperation(transformedData, operation);
  }

  // Format output if specified
  if (outputFormat) {
    transformedData = formatOutput(transformedData, outputFormat);
  }

  return {
    success: true,
    originalData: input,
    transformedData,
    operationsApplied: operations.length,
  };
}

/**
 * Apply a single transformation operation
 */
async function applyOperation(
  data: Record<string, any>,
  operation: any
): Promise<Record<string, any>> {
  const { type, field, value, newField } = operation;

  switch (type) {
    case 'rename':
      // Rename a field
      if (data[field] !== undefined) {
        data[newField] = data[field];
        delete data[field];
      }
      break;

    case 'map':
      // Map a field through a function
      if (data[field] !== undefined && operation.mapping) {
        data[field] = operation.mapping[data[field]] || data[field];
      }
      break;

    case 'set':
      // Set a field to a specific value
      data[field] = value;
      break;

    case 'remove':
      // Remove a field
      delete data[field];
      break;

    case 'merge':
      // Merge with another object
      data = { ...data, ...value };
      break;

    case 'filter':
      // Filter array field
      if (Array.isArray(data[field]) && operation.condition) {
        data[field] = data[field].filter((item: any) =>
          evaluateCondition(item, operation.condition)
        );
      }
      break;

    case 'transform':
      // Custom transformation function
      if (operation.function) {
        data[field] = evaluateFunction(data[field], operation.function);
      }
      break;

    default:
      console.warn(`Unknown operation type: ${type}`);
  }

  return data;
}

/**
 * Format output data
 */
function formatOutput(
  data: Record<string, any>,
  format: string
): Record<string, any> {
  switch (format) {
    case 'flat':
      return flattenObject(data);
    case 'nested':
      return data; // Already nested
    case 'array':
      return { items: Object.values(data) };
    default:
      return data;
  }
}

/**
 * Flatten nested object
 */
function flattenObject(
  obj: any,
  prefix: string = ''
): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

/**
 * Evaluate condition on data
 */
function evaluateCondition(data: any, condition: any): boolean {
  const { field, operator, value } = condition;

  const fieldValue = data[field];

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
      return fieldValue !== value;
    case 'greaterThan':
      return fieldValue > value;
    case 'lessThan':
      return fieldValue < value;
    case 'contains':
      return String(fieldValue).includes(value);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    default:
      return true;
  }
}

/**
 * Evaluate transformation function
 */
function evaluateFunction(value: any, functionName: string): any {
  switch (functionName) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    case 'reverse':
      return Array.isArray(value) ? value.reverse() : value;
    case 'length':
      return Array.isArray(value) || typeof value === 'string' ? value.length : 0;
    case 'parseInt':
      return parseInt(String(value), 10);
    case 'parseFloat':
      return parseFloat(String(value));
    case 'toString':
      return String(value);
    case 'toJSON':
      return JSON.stringify(value);
    case 'parseJSON':
      return JSON.parse(String(value));
    default:
      return value;
  }
}
