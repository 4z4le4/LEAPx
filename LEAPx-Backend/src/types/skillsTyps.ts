export type CreateMainSkillRequest = {
  name_TH: string;
  name_EN: string;
  description_TH?: string;
  description_EN?: string;
  slug: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export type CreateSubSkillRequest = {
  mainSkillCategory_id: number;
  name_TH: string;
  name_EN: string;
  description_TH?: string;
  description_EN?: string;
  slug: string;
  icon?: string;
  color?: string;
  sortOrder: number; // 1, 2, or 3
}

export type UpdateMainSkillRequest = Partial<CreateMainSkillRequest> & {
  id: number;
  isActive?: boolean;
}

export type UpdateSubSkillRequest = Partial<CreateSubSkillRequest> & {
  id: number;
  isActive?: boolean;
}


export type JWTPayloadSkills = {
  userId: number;
  email: string;
}

export type UserWithRole = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: {
    name: string;
  };
}

export type GetSkillsParams = {
  includeSubSkills?: boolean;
  includeUserLevels?: boolean;
  activeOnly?: boolean;
  userId?: number;
}

export type SkillSummary = {
  maxLevel: number;
  averageLevel: number;
  totalExp?: number;
  completedSubSkills: number;
  totalSubSkills: number;
}

export type MainSkillCategoryWithSummary = {
  id: number;
  name_TH: string;
  name_EN: string;
  description_TH: string | null;
  description_EN: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  subSkills?: SubSkillWithLevels[];
  userMainSkillLevels?: UserMainSkillLevel[];
  summary?: SkillSummary | null;
}

export type SubSkillWithLevels = {
  id: number;
  mainSkillCategory_id: number;
  name_TH: string;
  name_EN: string;
  description_TH: string | null;
  description_EN: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  userSubSkillLevels?: UserSubSkillLevel[];
}

export type UserMainSkillLevel = {
  id: number;
  user_id: number;
  mainSkillCategory_id: number;
  maxLevel: number;
  averageLevel: number;
  totalExp?: number;
  lastCalculated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserSubSkillLevel = {
  id: number;
  user_id: number;
  subSkillCategory_id: number;
  currentExp: number;
  currentLevel: number;
  expToNextLevel: number;
  totalEvents: number;
  lastEventAt: Date | null;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}