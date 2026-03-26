import type { MajorCategory } from '../majors/majors.types';

/**
 * Event status enum
 */
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

/**
 * Skill reward level type
 */
export type LevelType = 'I' | 'II' | 'III' | 'IV';

/**
 * Event skill reward
 */
export interface EventSkillReward {
  id?: number;
  subSkillCategory_id: number;
  baseExperience: number;
  bonusExperience: number;
  levelType: LevelType;

  requireCheckIn?: boolean;
  requireCheckOut?: boolean;
  requireOnTime?: boolean;
}

/**
 * Check-in time slot
 */
export interface CheckInTimeSlot {
  id?: number;
  event_id?: number;

  slot_number: number;

  startTime: string; // ISO
  endTime: string;   // ISO

  name_TH: string;
  name_EN: string;
  description_TH?: string | null;
  description_EN?: string | null;

  skillRewards?: EventSkillReward[];
}

/**
 * Event photo
 */
export interface EventPhoto {
  id: number;
  cloudinaryImage: {
    id: number;
    url: string;
    secureUrl?: string;
    publicId?: string;
    width?: number;
    height?: number;
    format?: string;
  };
  isMain?: boolean;
}

/**
 * Event creator/user
 */
export interface EventCreator {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
}

/**
 * Participant in predetermined list
 */
export interface PredeterminedParticipant {
  studentId: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Full event data from API
 */
export interface Event {
  id: number;
  slug: string;
  title_TH: string;
  title_EN: string;
  description_TH: string;
  description_EN: string;
  status: EventStatus;
  majorCategory?: MajorCategory;
  majorCategory_id?: number;
  maxParticipants: number;
  currentParticipants?: number;
  availableSlots?: number;
  isFull?: boolean;
  maxStaffCount: number;
  currentStaffCount?: number;
  waitlistEnabled: boolean;
  walkinEnabled: boolean;
  walkinCapacity?: number;
  registrationStart: string; // ISO 8601 datetime
  registrationEnd: string; // ISO 8601 datetime
  activityStart: string; // ISO 8601 datetime
  activityEnd: string; // ISO 8601 datetime
  checkInStart?: string; // ISO 8601 datetime
  checkInEnd?: string; // ISO 8601 datetime
  lateCheckInPenalty?: number;
  staffCheckInTime?: number;
  location_TH?: string;
  location_EN?: string;
  locationMapUrl?: string;
  isOnline: boolean;
  meetingLink?: string;
  priority: number;
  isForCMUEngineering: boolean;
  isForCMUEngineering_Staff: boolean;
  allowedYearLevels: number[];
  staffAllowedYears: number[];
  staffCommunicationLink?: string;
  requirePredeterminedList: boolean;
  predeterminedParticipants?: PredeterminedParticipant[];
  photos?: EventPhoto[];
  creator?: EventCreator;
  skillRewards?: EventSkillReward[];
  checkInTimeSlots?: CheckInTimeSlot[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    registrations?: number;
    skillRewards?: number;
  };
}

/**
 * Request payload for creating an event
 */
export interface CreateEventRequest {
  // Basic Info
  title_TH: string;
  title_EN: string;
  description_TH: string;
  description_EN: string;
  slug?: string;
  status?: EventStatus;
  priority?: number;
  
  // Major Category
  majorCategory_id: number;
  
  // Schedule
  registrationStart: string; // ISO 8601
  registrationEnd: string; // ISO 8601
  activityStart: string; // ISO 8601
  activityEnd: string; // ISO 8601
  
  // Check-in Times
  checkInStart?: string; // ISO 8601
  checkInEnd?: string; // ISO 8601
  lateCheckInPenalty?: number;
  staffCheckInTime?: number;
  
  // Location
  isOnline: boolean;
  location_TH?: string;
  location_EN?: string;
  locationMapUrl?: string;
  meetingLink?: string;
  
  // Capacity
  maxParticipants?: number;
  maxStaffCount?: number;
  walkinEnabled?: boolean;
  walkinCapacity?: number;
  waitlistEnabled?: boolean;
  
  // Audience
  isForCMUEngineering: boolean;
  isForCMUEngineering_Staff: boolean;
  allowedYearLevels: number[];
  staffAllowedYears: number[];
  
  // Staff
  staffCommunicationLink?: string;
  
  // Predetermined Participants
  requirePredeterminedList: boolean;
  predeterminedParticipants?: string; // JSON string
  
  // Skills & Time Slots
  skillRewards?: string; // JSON string
  checkInTimeSlots?: string; // JSON string
  
  // Images (handled via FormData)
  image_0?: File;
  image_1?: File;
  image_2?: File;
  image_3?: File;
  mainImageIndex?: number;
}

/**
 * Request payload for updating an event
 */
export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  event_id: number;
  deletePhotoIds?: string; // JSON string of photo IDs to delete
}

/**
 * Response for create/update event
 */
export interface EventResponse {
  success: boolean;
  message: string;
  data: Event;
  imagesUploaded?: number;
  photosDeleted?: number;
  photosAdded?: number;
}

/**
 * Response for delete event
 */
export interface DeleteEventResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    title_EN: string;
    title_TH: string;
    photosDeleted: number;
  };
}

/**
 * Query parameters for fetching events (admin)
 */
export interface GetEventsParams {
  status?: EventStatus;
  isOnline?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeSkillRewards?: boolean;
  includeStats?: boolean;
  old_events?: boolean;
}

/**
 * Response for fetching events list
 */
export interface GetEventsResponse {
  success: boolean;
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  userPermissions: {
    isSupreme: boolean;
    adminMajorIds: number[];
  };
}

/**
 * Query parameters for public events
 */
export interface GetPublicEventsParams {
  search?: string;
  isOnline?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  mainSkillId?: number;
}

/**
 * Response for public events
 */
export interface GetPublicEventsResponse {
  success: boolean;
  data: Event[];
  availableCategories: MajorCategory[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}
