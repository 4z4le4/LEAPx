export type EventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "COMPLETED"
  | "CANCELLED";

export interface EventReport {
  id: number;
  slug: string;

  title_TH: string;
  title_EN: string;

  status: EventStatus;

  /* ผู้เข้าร่วมปกติ */
  maxParticipants: number;
  currentParticipants: number;

  /* staff */
  maxStaffCount: number;
  currentStaffCount: number;

  /* walk-in */
  walkinCapacity: number;
  currentWalkins: number;

  activityStart: string;
  activityEnd: string;

  registrationStart: string;
  registrationEnd: string;

  location_TH: string;
  isOnline: boolean;

  photos?: {
    id: number;
    isMain: boolean;
    sortOrder: number;
    cloudinaryImage: {
      url: string;
    };
  }[];

  majorCategory?: {
    id: number;
    code: string;
    name_TH: string;
    name_EN: string;
  } | null;

  _count?: {
    registrations: number;
  };
}

export interface EventsResponse {
  success: boolean;
  data: EventReport[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}