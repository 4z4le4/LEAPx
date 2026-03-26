/**
 * Major category role type
 */
export type MajorAdminRole = 'OWNER' | 'ADMIN';

/**
 * Major category data
 */
export interface MajorCategory {
  id: number;
  code: string;
  name_TH: string;
  name_EN: string;
  faculty_TH?: string;
  faculty_EN?: string;
  description_TH?: string;
  description_EN?: string;
  icon?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  admins?: MajorAdmin[];
  events?: MajorEvent[];
}

/**
 * Major admin user data
 */
export interface MajorAdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
}

/**
 * Major administrator
 */
export interface MajorAdmin {
  id: number;
  user_id: number;
  majorCategory_id: number;
  role: MajorAdminRole;
  assignedAt: string;
  isActive: boolean;
  user: MajorAdminUser;
}

/**
 * Event belonging to major (simplified)
 */
export interface MajorEvent {
  id: number;
  title_TH: string;
  title_EN: string;
  status: string;
  activityStart: string;
  activityEnd: string;
}

/**
 * Parameters for getting major categories
 */
export interface GetMajorCategoriesParams {
  id?: number;
  code?: string;
  isActive?: boolean;
  includeAdmins?: boolean;
  includeEvents?: boolean;
}

/**
 * Response for getting single major category
 */
export interface GetMajorCategoryResponse {
  success: boolean;
  data: MajorCategory;
}

/**
 * Response for getting multiple major categories
 */
export interface GetMajorCategoriesResponse {
  success: boolean;
  total: number;
  data: MajorCategory[];
}

/**
 * Request to create major category (SUPREME only)
 */
export interface CreateMajorCategoryRequest {
  code: string;
  name_TH: string;
  name_EN: string;
  faculty_TH?: string;
  faculty_EN?: string;
  description_TH?: string;
  description_EN?: string;
  icon?: string;
  isActive?: boolean;
}

/**
 * Request to update major category
 */
export interface UpdateMajorCategoryRequest extends Partial<CreateMajorCategoryRequest> {
  id: number;
}

/**
 * Response for create/update major category
 */
export interface MajorCategoryResponse {
  success: boolean;
  message: string;
  data: MajorCategory;
}

/**
 * Response for delete major category
 */
export interface DeleteMajorCategoryResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    code: string;
  };
}

/**
 * Parameters for getting major admins
 */
export interface GetMajorAdminsParams {
  majorCategory_id?: number;
  user_id?: number;
  isActive?: boolean;
}

/**
 * Response for getting major admins
 */
export interface GetMajorAdminsResponse {
  success: boolean;
  data: MajorAdmin[];
}

/**
 * Request to add major admin
 */
export interface AddMajorAdminRequest {
  majorCategory_id: number;
  user_id: number;
  role: MajorAdminRole;
}

/**
 * Request to update major admin
 */
export interface UpdateMajorAdminRequest {
  id: number;
  role?: MajorAdminRole;
  isActive?: boolean;
}

/**
 * Response for add/update major admin
 */
export interface MajorAdminResponse {
  success: boolean;
  message: string;
  data: MajorAdmin;
}

/**
 * Response for delete major admin
 */
export interface DeleteMajorAdminResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    user_id: number;
    majorCategory_id: number;
  };
}

/**
 * User's major admin roles
 */
export interface UserMajorRoles {
  majorCategories: Array<{
    id: number;
    code: string;
    name_TH: string;
    name_EN: string;
    role: MajorAdminRole;
  }>;
  isSupreme: boolean;
}

/**
 * Response for checking user major roles
 */
export interface CheckMajorRolesResponse {
  success: boolean;
  data: UserMajorRoles;
}
