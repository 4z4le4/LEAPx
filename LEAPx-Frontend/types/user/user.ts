export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    faculty: string;
    major: string | null;
    photo: string;
    isActive: boolean;
}

export interface ApiResponse {
    success: boolean;
    user: User;
}

export interface RadarDataPoint {
    skill: string;
    skill_TH: string;
    value: number;
    maxLevel: number;
    color: string | null;
}

export interface LevelData {
    exp: number;
    stars: number;
    isUnlocked: boolean;
    progress: number;
    threshold: number;
}
export interface SubSkillDetailed {
    id: number;
    subSkillCategory_id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    currentLevel: number;
    totalExp: number;
    levels: {
        I: LevelData;
        II: LevelData;
        III: LevelData;
        IV: LevelData;
    };
    totalStars: number;
}

export interface SkillCategoryDetailed {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    maxLevel: number;
    averageLevel: number;
    totalExp: number;
    totalStars: number;
    totalSubSkills: number;
    completedSubSkills: number;
    levelBreakdown: {
        Level_I: number;
        Level_II: number;
        Level_III: number;
        Level_IV: number;
    };
    radarValue: number;
    subSkills: SubSkillDetailed[];
}

export interface ExpApiResponse {
    success: boolean;
    data: {
        summary: SkillCategoryDetailed[];
        detailed: SkillCategoryDetailed[];
        radarData: RadarDataPoint[];
        overall: {
        totalExp: number;
        totalStars: number;
        averageLevel: number;
        maxLevel: number;
        };
    };
}

export interface SubSkillBase {
    id: number;
    mainSkillCategory_id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
}

export interface SkillCategoryBase {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    subSkills: SubSkillBase[];
}

export interface SkillsApiResponse {
    success: boolean;
    data: SkillCategoryBase[];
}



export interface SkillsData {
    radarData: RadarDataPoint[];
    detailed: SkillCategory[];
}

export interface SkillCategory {
    id: number;
    name_TH: string;
    name_EN: string;
    icon: string;
    maxLevel: number;
    totalExp: number;
    totalStars: number;
    subSkills: SubSkill[];
}

export interface SkillLevel {
    exp: number;
    stars: number;
    isUnlocked: boolean;
    progress: number;
    threshold: number;
}

export interface SubSkill {
    id: number;
    name_TH: string;
    name_EN: string;
    currentLevel: number;
    totalExp: number;
    totalStars: number;
    levels: {
        I: SkillLevel;
        II: SkillLevel;
        III: SkillLevel;
        IV: SkillLevel;
    };
}

export interface SkillCardProps {
    skill: SkillCategory;
    viewMode: 'compact' | 'detailed';
}

export interface EventRegistration {
    id: number;
    user_id: number;
    event_id: number;
    registrationType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REGISTERED' | 'ATTENDED' | 'COMPLETED' | 'INCOMPLETE' | 'LATE' | 'LATE_PENALTY' | 'ABSENT' | 'UNDER_REVIEW' | 'NEED_MORE_INFO';
    checkedIn: boolean;
    checkInTime: string | null;
    checkedOut: boolean;
    checkOutTime: string | null;
    experienceEarned: number;
    hasEvaluated: boolean;
    cancellationReason: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
    event: {
        id: number;
        title_EN: string;
        title_TH: string;
        status: string;
        activityStart: string;
        activityEnd: string;
    };
}

export interface ApiResponse {
    success: boolean;
    data: EventRegistration[];
}


export interface MainSkillSummary {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    maxLevel: number;
    averageLevel: number;
    totalExp: number;
    totalStars: number;
    totalSubSkills: number;
    completedSubSkills: number;
    levelBreakdown: {
        Level_I: number;
        Level_II: number;
        Level_III: number;
        Level_IV: number;
    };
    radarValue: number;
}

export interface SkillSummaryResponse {
    success: boolean;
    data: {
        summary: MainSkillSummary[];
        radarData: {
            skill: string;
            skill_TH: string;
            value: number;
            maxLevel: number;
            color: string | null;
        }[];
        overall: {
            totalExp: number;
            totalStars: number;
            averageLevel: number;
            maxLevel: number;
        };
    };
}

export interface LevelDetail {
    exp: number;
    stars: number;
    isUnlocked: boolean;
    threshold: number;
    progress: number;
    expToNextStar: number;
}

export interface SubSkillDetail {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    description_TH: string | null;
    description_EN: string | null;
    sortOrder: number;
    currentLevel: number;
    maxLevel: number;
    totalExp: number;
    levels: {
        I: LevelDetail;
        II: LevelDetail;
        III: LevelDetail;
        IV: LevelDetail;
    };
    totalStars: number;
}

export interface MainSkillDetail {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string;
    color: string | null;
    description_TH: string | null;
    description_EN: string | null;
    sortOrder: number;
    statistics: {
        maxLevel: number;
        averageLevel: number;
        totalExp: number;
        totalStars: number;
        totalSubSkills: number;
        completedSubSkills: number;
        completionPercentage: number;
        levelBreakdown: {
            Level_I: number;
            Level_II: number;
            Level_III: number;
            Level_IV: number;
        };
    };
    subSkills: SubSkillDetail[];
}

export interface SkillDetailResponse {
    success: boolean;
    data: {
        user: {
            id: number;
            name: string;
            faculty: string;
            major: string | null;
        };
        overallStats: {
            totalExp: number;
            totalStars: number;
            totalMainSkills: number;
            totalSubSkills: number;
            completedSubSkills: number;
            averageLevel: number;
            maxLevel: number;
            completionPercentage: number;
        };
        mainSkills: MainSkillDetail[];
    };
}


export interface SubSkillReward {
    id: number;
    name_TH: string;
    name_EN: string;
    slug: string;
    icon: string | null;
    color: string | null;
    levelType: string;
    baseExperience: number;
    bonusExperience: number;
}

export interface MainSkillReward {
    mainSkill: {
        id: number;
        name_TH: string;
        name_EN: string;
        slug: string;
        icon: string | null;
        color: string | null;
    };
    subSkills: SubSkillReward[];
}

export interface EventWithSkills {
    id: number;
    title_EN: string;
    title_TH: string;
    status: string;
    activityStart: string;
    activityEnd: string;
    skillsByMainCategory: MainSkillReward[];
}

export interface EventRegistrationHistory {
    id: number;
    user_id: number;
    event_id: number;
    registrationType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REGISTERED' | 'ATTENDED' | 'COMPLETED' | 'INCOMPLETE' | 'LATE' | 'LATE_PENALTY' | 'ABSENT' | 'UNDER_REVIEW' | 'NEED_MORE_INFO';
    checkedIn: boolean;
    checkInTime: string | null;
    checkedOut: boolean;
    checkOutTime: string | null;
    experienceEarned: number;
    hasEvaluated: boolean;
    cancellationReason: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
    event: EventWithSkills;
}

export interface StaffRegistrationHistory {
    id: number;
    event_id: number;
    user_id: number;
    StaffRole_id: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REGISTERED' | 'ATTENDED' | 'COMPLETED' | 'INCOMPLETE' | 'LATE' | 'LATE_PENALTY' | 'ABSENT' | 'UNDER_REVIEW' | 'NEED_MORE_INFO';
    responsibilities: string | null;
    assignedAt: string;
    assignedBy: string | null;
    createdAt: string;
    updatedAt: string;
    checkedIn: boolean;
    checkInTime: string | null;
    checkedOut: boolean;
    checkOutTime: string | null;
    event: EventWithSkills;
}

export interface EventHistoryResponse {
    success: boolean;
    data: EventRegistrationHistory[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

export interface StaffHistoryResponse {
    success: boolean;
    data: StaffRegistrationHistory[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}