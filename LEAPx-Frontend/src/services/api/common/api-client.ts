/**
 * Axios instance configured for LEAP Backend API
 */

import axios from 'axios';
import { backend_url } from '../../../../utils/constants';

/**
 * Pre-configured axios instance for API calls
 * - BaseURL from environment constants
 * - Credentials included for authentication
 * - JSON content type by default
 */
export const apiClient = axios.create({
  baseURL: backend_url,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Request interceptor for authentication and logging
 */
apiClient.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('[API Error]', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);
