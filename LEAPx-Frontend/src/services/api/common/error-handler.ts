/**
 * Centralized error handling for API calls
 */

import { AxiosError } from 'axios';
import type { ApiError } from './types';

/**
 * Custom error class for API errors with user-friendly messages
 */
export class ApiException extends Error {
  public status?: number;
  public details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.details = details;
  }
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    // Check for ApiError format
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }

    // Check for message field
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }

  return 'An unexpected error occurred';
}

/**
 * Handle API errors and convert to user-friendly messages
 * 
 * @param error - The error from axios or other source
 * @returns ApiException with formatted message
 */
export function handleApiError(error: unknown): ApiException {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as ApiError | undefined;

    // Extract message from response
    const message = data ? extractErrorMessage(data) : error.message;

    // Map status codes to user-friendly messages
    switch (status) {
      case 400:
        return new ApiException(
          message || 'Invalid request. Please check your input.',
          status,
          data?.details
        );
      case 401:
        return new ApiException(
          'Authentication required. Please log in.',
          status
        );
      case 403:
        return new ApiException(
          message || 'You do not have permission to perform this action.',
          status
        );
      case 404:
        return new ApiException(
          message || 'The requested resource was not found.',
          status
        );
      case 409:
        return new ApiException(
          message || 'This resource already exists.',
          status
        );
      case 500:
      case 502:
      case 503:
        return new ApiException(
          'Server error. Please try again later.',
          status
        );
      default:
        return new ApiException(
          message || 'An error occurred. Please try again.',
          status,
          data?.details
        );
    }
  }

  // Handle other error types
  if (error instanceof Error) {
    return new ApiException(error.message);
  }

  // Fallback for unknown errors
  return new ApiException('An unexpected error occurred');
}

/**
 * Check if error is a specific HTTP status code
 */
export function isApiErrorStatus(error: unknown, status: number): boolean {
  return error instanceof ApiException && error.status === status;
}

/**
 * Check if error is authentication related (401 or 403)
 */
export function isAuthError(error: unknown): boolean {
  return (
    error instanceof ApiException &&
    (error.status === 401 || error.status === 403)
  );
}

/**
 * Check if error is a validation error (400)
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof ApiException && error.status === 400;
}
