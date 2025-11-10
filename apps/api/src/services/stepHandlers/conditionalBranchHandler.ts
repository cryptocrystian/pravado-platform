// =====================================================
// CONDITIONAL BRANCH HANDLER
// Core Infrastructure Days 3-6
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { PlaybookStep } from '@pravado/types';
import { StepExecutionContext } from './index';

/**
 * Handle CONDITIONAL_BRANCH step type
 * Evaluates conditions to determine execution path
 */
export async function handleConditionalBranch(
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
): Promise<Record<string, any>> {
  const { conditions } = step.config;

  if (!conditions || !Array.isArray(conditions)) {
    throw new Error('Conditions array is required for CONDITIONAL_BRANCH step');
  }

  console.log(`Evaluating ${conditions.length} conditions`);

  // Evaluate each condition
  const results = conditions.map((condition: any) => {
    const result = evaluateCondition(input, condition, context);
    return {
      condition: condition.name || 'unnamed',
      result,
      branchTo: result ? condition.trueBranch : condition.falseBranch,
    };
  });

  // Find first matching condition
  const matchedCondition = results.find((r) => r.result);

  return {
    success: true,
    evaluatedConditions: results,
    matchedCondition: matchedCondition?.condition,
    branchTo: matchedCondition?.branchTo,
  };
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  data: Record<string, any>,
  condition: any,
  context: StepExecutionContext
): boolean {
  const { field, operator, value, type } = condition;

  // Get field value from input data
  let fieldValue = data[field];

  // Handle context references
  if (field?.startsWith('$context.')) {
    const contextKey = field.substring(9);
    fieldValue = context.executionData[contextKey];
  }

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
      return fieldValue !== value;
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(value);
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(value);
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'startsWith':
      return String(fieldValue).startsWith(String(value));
    case 'endsWith':
      return String(fieldValue).endsWith(String(value));
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'isEmpty':
      return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}
