/**
 * Common types for API responses and errors
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  details?: unknown;
  message?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationMeta;
}

/**
 * User permissions response
 */
export interface UserPermissions {
  isSupreme: boolean;
  adminMajorIds: number[];
}
