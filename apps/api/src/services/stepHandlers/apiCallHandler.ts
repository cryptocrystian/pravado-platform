// =====================================================
// API CALL HANDLER
// Core Infrastructure Days 3-6
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { PlaybookStep } from '@pravado/types';
import { StepExecutionContext } from './index';

/**
 * Handle API_CALL step type
 * Makes HTTP requests to external APIs
 */
export async function handleApiCall(
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
): Promise<Record<string, any>> {
  const { url, method = 'GET', headers = {}, body, timeout = 30000 } = step.config;

  if (!url) {
    throw new Error('URL is required for API_CALL step');
  }

  console.log(`Making ${method} request to ${url}`);

  try {
    // Prepare request
    const requestUrl = interpolateUrl(url, input);
    const requestHeaders = interpolateHeaders(headers, input);
    const requestBody = body ? interpolateBody(body, input) : undefined;

    // Make API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    const responseData = await parseResponse(response);

    return {
      success: true,
      statusCode: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    };
  } catch (error: any) {
    console.error(`API call failed:`, error);

    return {
      success: false,
      error: error.message,
      errorType: error.name,
    };
  }
}

/**
 * Interpolate URL with input values
 */
function interpolateUrl(url: string, input: Record<string, any>): string {
  let interpolatedUrl = url;

  // Replace {variable} patterns with input values
  const matches = url.match(/\{([^}]+)\}/g);
  if (matches) {
    for (const match of matches) {
      const key = match.substring(1, match.length - 1);
      const value = input[key];
      if (value !== undefined) {
        interpolatedUrl = interpolatedUrl.replace(match, String(value));
      }
    }
  }

  return interpolatedUrl;
}

/**
 * Interpolate headers with input values
 */
function interpolateHeaders(
  headers: Record<string, string>,
  input: Record<string, any>
): Record<string, string> {
  const interpolatedHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    interpolatedHeaders[key] = interpolateString(value, input);
  }

  return interpolatedHeaders;
}

/**
 * Interpolate body with input values
 */
function interpolateBody(
  body: Record<string, any>,
  input: Record<string, any>
): Record<string, any> {
  const interpolatedBody: Record<string, any> = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      interpolatedBody[key] = interpolateString(value, input);
    } else if (typeof value === 'object') {
      interpolatedBody[key] = interpolateBody(value, input);
    } else {
      interpolatedBody[key] = value;
    }
  }

  return interpolatedBody;
}

/**
 * Interpolate string with input values
 */
function interpolateString(str: string, input: Record<string, any>): string {
  let result = str;

  const matches = str.match(/\{([^}]+)\}/g);
  if (matches) {
    for (const match of matches) {
      const key = match.substring(1, match.length - 1);
      const value = input[key];
      if (value !== undefined) {
        result = result.replace(match, String(value));
      }
    }
  }

  return result;
}

/**
 * Parse API response
 */
async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return await response.json();
  } else if (contentType?.includes('text/')) {
    return await response.text();
  } else {
    return await response.blob();
  }
}
