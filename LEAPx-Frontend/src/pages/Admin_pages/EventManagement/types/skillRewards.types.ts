export type SkillLevelType = "I" | "II" | "III" | "IV";

export interface CreateSkillRewardRequest {
  subSkillCategory_id: number;
  levelType: SkillLevelType;
  baseExperience: number;
  bonusExperience: number;
  requireCheckIn: boolean;
  requireCheckOut: boolean;
  requireOnTime: boolean;
}

export interface SkillReward {
  id: number;
  checkInTimeSlot_id: number;
  subSkillCategory_id: number;
  levelType: SkillLevelType;
  baseExperience: number;
  bonusExperience: number;
  requireCheckIn: boolean;
  requireCheckOut: boolean;
  requireOnTime: boolean;
}

export interface CreateSkillRewardResponse {
  success: boolean;
  message: string;
  data: SkillReward;
}