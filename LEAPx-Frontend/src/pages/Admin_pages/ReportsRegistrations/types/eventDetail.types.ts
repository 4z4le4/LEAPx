export interface EventPhoto {
  id: number;
  isMain: boolean;
  sortOrder: number;
  cloudinaryImage: {
    url: string;
  };
}

export interface EventMajorCategory {
  id: number;
  code: string;
  name_TH: string;
  name_EN: string;
}

export interface EventDetail {
  id: number;
  slug: string;

  title_TH: string;
  title_EN: string;

  status: string;

  activityStart: string;
  activityEnd: string;

  registrationStart: string;
  registrationEnd: string;

  maxParticipants: number;
  currentParticipants: number;

  maxStaffCount: number;
  currentStaffCount: number;

  walkinCapacity: number;
  currentWalkins: number;

  photos?: EventPhoto[];

  majorCategory?: EventMajorCategory | null;
}

export interface EventDetailResponse {
  success: boolean;
  data: EventDetail;
}