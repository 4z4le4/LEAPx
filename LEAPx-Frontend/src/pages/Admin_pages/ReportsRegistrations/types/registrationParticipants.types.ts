export interface ParticipantSkill {
  skillId: number;
  skillName_TH: string;
  skillName_EN: string;
  levelType: number | null;
  expEarned: number;
}

export interface Participant {
  registrationId: number;
  studentId: number;
  fullName: string;
  email: string;

  faculty: string;
  major: string;

  status: string;
  statusDate: string;

  totalExpEarned: number;

  skills: ParticipantSkill[];
}

export interface EventParticipantsData {
  event: {
    id: number;
    title_TH: string;
    title_EN: string;
    slug: string;

    status: string;

    activityStart: string;
    activityEnd: string;

  /* ผู้เข้าร่วมปกติ */
  maxParticipants: number;
  currentParticipants: number;

  /* staff */
  maxStaffCount: number;
  currentStaffCount: number;

  /* walk-in */
  walkinCapacity: number;
  currentWalkins: number;

    allowMultipleCheckIns: boolean;
  };

  statistics: {
    total: number;
    checkedIn: number;
    checkedOut: number;
    completed: number;
    late: number;
    absent: number;
    totalExpDistributed: number;
  };

  participants: Participant[];

  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface EventParticipantsResponse {
  success: boolean;
  data: EventParticipantsData;
}