export type AddExpRequest = {
    user_id: number;
    subSkillCategory_id: number;
    levelType: 'I' | 'II' | 'III' | 'IV';
    exp: number;
    reason_TH: string;
    reason_EN: string;
    type: 'ACTIVITY_COMPLETION' | 'BONUS_REWARD' | 'MANUAL_ADJUSTMENT';

}

export type LevelThresholds = {
    I: number;
    II: number; 
    III: number;
    IV: number;
}

export type JWTPayloadEXP = {
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

export type SubSkillLevel = {
    Level_I_stars: number;
    Level_II_stars: number;
    Level_III_stars: number;
    Level_IV_stars: number;
    Level_I_exp: number;
    Level_II_exp: number;
    Level_III_exp: number;
    Level_IV_exp: number;
    totalExp: number;
}

export type ResetLevelRequest = {
    user_id: number;
    subSkillCategory_id?: number; 
    resetType: 'COMPLETE' | 'PARTIAL';
    resetOptions?: {
        Level_I?: boolean;
        Level_II?: boolean;
        Level_III?: boolean;
        Level_IV?: boolean;
        resetExp?: boolean; // Reset EXP to 0
        resetStars?: boolean; // Reset stars to 0
    };
    reason_TH: string;
    reason_EN: string;
    adminNote?: string;
}

export type SubSkillLevelData = {
    subSkillCategory: number;
    id: number;
    subSkillCategory_id: number;
    Level_I_exp: number;
    Level_II_exp: number;
    Level_III_exp: number;
    Level_IV_exp: number;
    Level_I_stars: number;
    Level_II_stars: number;
    Level_III_stars: number;
    Level_IV_stars: number;
    currentLevel: number;
    totalExp: number;
}