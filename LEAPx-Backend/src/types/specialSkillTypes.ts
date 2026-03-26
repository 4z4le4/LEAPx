export enum SpecialSkillActionType {
  EVENT_REWARD = 'EVENT_REWARD',           // ได้จากการเข้าร่วมกิจกรรม
  BONUS = 'BONUS',                          // โบนัส
  DISCIPLINE_PENALTY = 'DISCIPLINE_PENALTY', // ถูกหักเพราะละเมิดวินัย
  LATE_PENALTY = 'LATE_PENALTY',           // ถูกหักเพราะมาสาย
  ABSENCE_PENALTY = 'ABSENCE_PENALTY',     // ถูกหักเพราะขาดกิจกรรม
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', // ปรับโดย admin
  OTHER = 'OTHER'                          // อื่นๆ
}

// Base Special Skill
export interface SpecialSkill {
    id: number;
    name_TH: string;
    name_EN: string;
    description_TH?: string;
    description_EN?: string;
    slug: string;
    icon?: string;
    color?: string;
    maxLevel: number;
    expPerLevel: number;
    category: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// User's Special Skill Level
export interface UserSpecialSkillLevel {
    id: number;
    user_id: number;
    specialSkill_id: number;
    currentExp: number;
    currentLevel: number;
    totalExpEarned: number;
    positiveActions: number;
    negativeActions: number;
    maxLevelReached: number;
    reachedMaxAt?: Date;
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Special Skill History Entry
export interface SpecialSkillHistory {
    id: number;
    user_id: number;
    specialSkill_id: number;
    event_id?: number;
    expChange: number;
    previousExp: number;
    newExp: number;
    previousLevel: number;
    newLevel: number;
    reason_TH: string;
    reason_EN: string;
    actionType: SpecialSkillActionType;
    adjustedBy?: number;
    note?: string;
    createdAt: Date;
}

// Event Special Skill Reward
export interface EventSpecialSkillReward {
    id: number;
    event_id: number;
    specialSkill_id: number;
    baseExperience: number;
    bonusExperience: number;
    requireCheckIn: boolean;
    requireCheckOut: boolean;
    requireOnTime: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// api type
export interface CreateSpecialSkillRequest {
    name_TH: string;
    name_EN: string;
    description_TH?: string;
    description_EN?: string;
    slug?: string;
    icon?: string;
    color?: string;
    maxLevel?: number;
    expPerLevel?: number;
    category?: string;
    sortOrder?: number;
}

export interface UpdateSpecialSkillRequest extends Partial<CreateSpecialSkillRequest> {
    id: number;
    isActive?: boolean;
}

export interface GetSpecialSkillsParams {
    activeOnly?: boolean;
    category?: string;
    userId?: number;
    includeUserLevels?: boolean;
    specialSkillId?: number;
}

export interface SpecialSkillWithProgress extends SpecialSkill {
    userProgress?: UserSpecialSkillLevel & {
        progressToNextLevel: number;  // 0-100
        expToNextLevel: number;
        isMaxLevel: boolean;
    };
}

export interface AddSpecialSkillExpRequest {
    userId: number;
    specialSkillId: number;
    expChange: number;
    reason_TH: string;
    reason_EN: string;
    actionType: SpecialSkillActionType;
    eventId?: number;
    adjustedBy?: number;
    note?: string;
}

export interface SpecialSkillStats {
    totalSkills: number;
    activeSkills: number;
    totalUsers: number;
    averageLevel: number;
    topSkills: {
        skill: SpecialSkill;
        userCount: number;
        averageLevel: number;
    }[];
}


// Action type labels for display
export const SpecialSkillActionTypeLabels: Record<SpecialSkillActionType, { th: string; en: string }> = {
    [SpecialSkillActionType.EVENT_REWARD]: { th: 'รางวัลจากกิจกรรม', en: 'Event Reward' },
    [SpecialSkillActionType.BONUS]: { th: 'โบนัส', en: 'Bonus' },
    [SpecialSkillActionType.DISCIPLINE_PENALTY]: { th: 'ถูกหักเพราะละเมิดวินัย', en: 'Discipline Penalty' },
    [SpecialSkillActionType.LATE_PENALTY]: { th: 'ถูกหักเพราะมาสาย', en: 'Late Penalty' },
    [SpecialSkillActionType.ABSENCE_PENALTY]: { th: 'ถูกหักเพราะขาดกิจกรรม', en: 'Absence Penalty' },
    [SpecialSkillActionType.MANUAL_ADJUSTMENT]: { th: 'ปรับโดยแอดมิน', en: 'Manual Adjustment' },
    [SpecialSkillActionType.OTHER]: { th: 'อื่นๆ', en: 'Other' }
};