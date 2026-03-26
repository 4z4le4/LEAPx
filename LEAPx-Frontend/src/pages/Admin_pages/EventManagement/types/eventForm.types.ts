import type { EventMode, Participant } from '../../../../../types/api/event';
import type { DayExpConfig, ExpActivityType } from '../../../../components/Event/exp/EventExpPerDayEditor';

/**
 * Event form operation mode
 */
export type EventFormMode = 'create' | 'edit';

/**
 * Major category item structure
 */
export interface MajorItem {
  id: number;
  name_TH: string;
  name_EN: string;
  isActive?: boolean;
}

/**
 * Image upload payload for event photos
 */
export interface ImagePayload {
  newFiles: File[];
  mainIndex: number;
  deletedIds: number[];
  hasImage: boolean;
}

/**
 * Initial data structure when editing existing event
 * All fields are optional to support partial data loading
 */
export type EventInitialData = Partial<{
  id: number;

  title_TH: string | null;
  title_EN: string | null;
  description_TH: string | null;
  description_th: string | null;
  desc_TH: string | null;
  description: string | null;
  description_EN: string | null;
  description_en: string | null;
  desc_EN: string | null;
  descriptionEn: string | null;

  activityStart: string | null;
  activityEnd: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  checkInStart: string | null;
  checkInEnd: string | null;

  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | string;
  eventMode: EventMode;

  isOnline: boolean;
  meetingLink: string | null;
  location_TH: string | null;
  location_EN: string | null;
  locationMapUrl: string | null;

  isForCMUEngineering: boolean;
  isForCMUEngineering_Staff: boolean;
  allowedYearLevels: number[] | null;
  staffAllowedYears: number[] | null;

  maxParticipants: number | null;
  walkinCapacity: number | null;
  maxStaffCount: number | null;
  staffCommunicationLink: string | null;
  staffCheckInTime: number | null;
  staffEarlyCheckInMins: number | null;
  lateCheckInPenalty: number | null;

  majorCategory_id: number | null;

  requirePredeterminedList: boolean;
  predeterminedParticipants: Participant[];

  expByDay: DayExpConfig[];

  checkInTimeSlots: {
    startTime?: string | null;
    endTime?: string | null;
    subSkillCategory_id?: {
      id?: number;
      level?: ExpActivityType | null;
    }[];
  }[];

  skillRewards: {
    subSkillCategory_id?: number;
    levelType?: ExpActivityType | null;
    baseExperience?: number;
    subSkillCategory?: {
      id?: number;
      mainSkillCategory_id?: number;
      mainSkillCategory?: { id?: number } | null;
    } | null;
  }[];

  photos: Array<
    | string
    | {
        id?: number;
        isMain?: boolean | null;
        sortOrder?: number | null;
        cloudinaryImage?: { url?: string | null } | null;
        photoUrl?: string | null;
        url?: string | null;
        imageUrl?: string | null;
      }
  >;
}>;

/**
 * Props for EventForm component
 */
export interface EventFormProps {
  mode: EventFormMode;
  initialData?: EventInitialData | null;
  eventId?: number | null;
}

/**
 * Form validation errors structure
 */
export interface EventFormErrors {
  nameTH?: string;
  nameEN?: string;
  sDate?: string;
  sTime?: string;
  eDate?: string;
  eTime?: string;
  rsDate?: string;
  rsTime?: string;
  reDate?: string;
  reTime?: string;
  descTH?: string;
  descEN?: string;
  placeTH?: string;
  meetingLink?: string;
  majorCategory?: string;
  staffEarlyMin?: string;
  lateWindowMin?: string;
  expSkills?: string;
  images?: string;
}
