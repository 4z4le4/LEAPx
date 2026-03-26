/**
 * Business logic layer for Major Category API
 * Handles data transformation and error handling
 */

import { majorsAPI } from './majors.api';
import { handleApiError } from '../common/error-handler';
import type {
  MajorCategory,
  GetMajorCategoriesParams,
  CreateMajorCategoryRequest,
  UpdateMajorCategoryRequest,
  MajorCategoryResponse,
  DeleteMajorCategoryResponse,
  MajorAdmin,
  GetMajorAdminsParams,
  AddMajorAdminRequest,
  UpdateMajorAdminRequest,
  MajorAdminResponse,
  DeleteMajorAdminResponse,
  UserMajorRoles,
} from './majors.types';

// ===== Major Categories =====

/**
 * Get all major categories
 * 
 * @param params - Query parameters for filtering
 * @returns Promise with major categories list
 */
export async function getMajorCategories(
  params?: Omit<GetMajorCategoriesParams, 'id'>
): Promise<MajorCategory[]> {
  try {
    const response = await majorsAPI.getCategories(params);
    const data = response.data;
    
    // Response is array when no ID specified
    if ('data' in data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get single major category by ID
 * 
 * @param id - Major category ID
 * @param includeAdmins - Whether to include admins list
 * @param includeEvents - Whether to include events list
 * @returns Promise with major category data
 */
export async function getMajorCategoryById(
  id: number,
  includeAdmins: boolean = false,
  includeEvents: boolean = false
): Promise<MajorCategory> {
  try {
    const response = await majorsAPI.getCategories({
      id,
      includeAdmins,
      includeEvents,
    });
    
    const data = response.data;
    
    // Response is single object when ID specified
    if ('data' in data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data;
    }
    
    throw new Error('Major category not found');
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get major category by code
 * 
 * @param code - Major category code (e.g., "CPE", "EE")
 * @returns Promise with major category data
 */
export async function getMajorCategoryByCode(code: string): Promise<MajorCategory | null> {
  try {
    const response = await majorsAPI.getCategories({ code });
    const data = response.data;
    
    if ('data' in data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0];
    }
    
    return null;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get only active major categories
 * 
 * @returns Promise with active major categories
 */
export async function getActiveMajorCategories(): Promise<MajorCategory[]> {
  return getMajorCategories({ isActive: true });
}

/**
 * Create new major category (SUPREME only)
 * 
 * @param data - Major category data
 * @returns Promise with created major category
 */
export async function createMajorCategory(
  data: CreateMajorCategoryRequest
): Promise<MajorCategoryResponse> {
  try {
    const response = await majorsAPI.createCategory(data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Update major category
 * 
 * @param data - Major category data with ID
 * @returns Promise with updated major category
 */
export async function updateMajorCategory(
  data: UpdateMajorCategoryRequest
): Promise<MajorCategoryResponse> {
  try {
    const response = await majorsAPI.updateCategory(data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete major category
 * 
 * @param id - Major category ID
 * @returns Promise with deletion confirmation
 */
export async function deleteMajorCategory(id: number): Promise<DeleteMajorCategoryResponse> {
  try {
    const response = await majorsAPI.deleteCategory(id);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// ===== Major Administrators =====

/**
 * Get major admins
 * 
 * @param params - Query parameters for filtering
 * @returns Promise with major admins list
 */
export async function getMajorAdmins(params?: GetMajorAdminsParams): Promise<MajorAdmin[]> {
  try {
    const response = await majorsAPI.getAdmins(params);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get admins for specific major category
 * 
 * @param majorCategoryId - Major category ID
 * @returns Promise with admins list
 */
export async function getAdminsForMajor(majorCategoryId: number): Promise<MajorAdmin[]> {
  return getMajorAdmins({ majorCategory_id: majorCategoryId, isActive: true });
}

/**
 * Add major admin
 * 
 * @param data - Admin assignment data
 * @returns Promise with created admin assignment
 */
export async function addMajorAdmin(data: AddMajorAdminRequest): Promise<MajorAdminResponse> {
  try {
    const response = await majorsAPI.addAdmin(data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Update major admin
 * 
 * @param data - Admin update data
 * @returns Promise with updated admin assignment
 */
export async function updateMajorAdmin(
  data: UpdateMajorAdminRequest
): Promise<MajorAdminResponse> {
  try {
    const response = await majorsAPI.updateAdmin(data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete major admin
 * 
 * @param id - Admin assignment ID
 * @returns Promise with deletion confirmation
 */
export async function deleteMajorAdmin(id: number): Promise<DeleteMajorAdminResponse> {
  try {
    const response = await majorsAPI.deleteAdmin(id);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// ===== User Major Roles =====

/**
 * Check current user's major admin roles
 * 
 * @returns Promise with user's major roles
 */
export async function checkUserMajorRoles(): Promise<UserMajorRoles> {
  try {
    const response = await majorsAPI.checkRoles();
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Check if current user is admin of specific major
 * 
 * @param majorCategoryId - Major category ID
 * @returns Promise with boolean indicating admin status
 */
export async function isUserMajorAdmin(majorCategoryId: number): Promise<boolean> {
  try {
    const roles = await checkUserMajorRoles();
    
    // SUPREME can manage all majors
    if (roles.isSupreme) {
      return true;
    }
    
    // Check if user is admin of this specific major
    return roles.majorCategories.some(mc => mc.id === majorCategoryId);
  } catch (error) {
    throw handleApiError(error);
  }
}
