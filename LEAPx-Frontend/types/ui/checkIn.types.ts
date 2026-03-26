

export interface UICheckInTimeSlot {
  id: number;
  slot_number: number;

  date: string;        // yyyy-mm-dd
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm

  name_TH: string;
  name_EN: string;
  description_TH?: string;
  description_EN?: string;

  skillRewards: UIEventSkillReward[];
  allowCheckInBefore?: number; 
}



export interface UIEventSkillReward {
  id?: number;
  subSkillCategory_id: number;

  baseExperience: number;
  bonusExperience: number;
  levelType: "I" | "II" | "III" | "IV";

  requireCheckIn: boolean;
  requireCheckOut: boolean;
  requireOnTime: boolean;
}

