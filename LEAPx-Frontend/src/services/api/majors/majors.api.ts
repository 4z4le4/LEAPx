import { apiClient } from '../common/api-client';
import type {
  GetMajorCategoriesParams,
  GetMajorCategoryResponse,
  GetMajorCategoriesResponse,
  CreateMajorCategoryRequest,
  UpdateMajorCategoryRequest,
  MajorCategoryResponse,
  DeleteMajorCategoryResponse,
  GetMajorAdminsParams,
  GetMajorAdminsResponse,
  AddMajorAdminRequest,
  UpdateMajorAdminRequest,
  MajorAdminResponse,
  DeleteMajorAdminResponse,
  CheckMajorRolesResponse,
} from './majors.types';

/**
 * Major Category API endpoints
 */
export const majorsAPI = {
  // ===== Major Categories =====

  /**
   * Get major categories
   * GET /api/major/category
   */
  getCategories: (params?: GetMajorCategoriesParams) => {
    // If id is specified, response is single object
    // Otherwise, response is array
    if (params?.id) {
      return apiClient.get<GetMajorCategoryResponse>('/api/major/category', { params });
    }
    return apiClient.get<GetMajorCategoriesResponse>('/api/major/category', { params });
  },

  /**
   * Create major category (SUPREME only)
   * POST /api/major/category
   */
  createCategory: (data: CreateMajorCategoryRequest) =>
    apiClient.post<MajorCategoryResponse>('/api/major/category', data),

  /**
   * Update major category
   * PUT /api/major/category
   */
  updateCategory: (data: UpdateMajorCategoryRequest) =>
    apiClient.put<MajorCategoryResponse>('/api/major/category', data),

  /**
   * Delete major category
   * DELETE /api/major/category?id={id}
   */
  deleteCategory: (id: number) =>
    apiClient.delete<DeleteMajorCategoryResponse>('/api/major/category', {
      params: { id },
    }),

  // ===== Major Administrators =====

  /**
   * Get major admins
   * GET /api/major/manage
   */
  getAdmins: (params?: GetMajorAdminsParams) =>
    apiClient.get<GetMajorAdminsResponse>('/api/major/manage', { params }),

  /**
   * Add major admin
   * POST /api/major/manage
   */
  addAdmin: (data: AddMajorAdminRequest) =>
    apiClient.post<MajorAdminResponse>('/api/major/manage', data),

  /**
   * Update major admin
   * PUT /api/major/manage
   */
  updateAdmin: (data: UpdateMajorAdminRequest) =>
    apiClient.put<MajorAdminResponse>('/api/major/manage', data),

  /**
   * Delete major admin
   * DELETE /api/major/manage?id={id}
   */
  deleteAdmin: (id: number) =>
    apiClient.delete<DeleteMajorAdminResponse>('/api/major/manage', {
      params: { id },
    }),

  // ===== User Major Roles =====

  /**
   * Check user's major admin roles
   * GET /api/major/check
   */
  checkRoles: () =>
    apiClient.get<CheckMajorRolesResponse>('/api/major/check'),
};
