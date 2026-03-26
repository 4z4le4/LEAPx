// ---------- Enums ----------
export type EventStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";

// ---------- Cloudinary ----------
export type ApiCloudinaryImage = {
  id: number;           // cloudinaryImage.id
  publicId: string;     // เช่น "folder/img_xxx"
  url: string;          // secure_url
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  etag?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ---------- Photos ----------
export type ApiEventPhoto = {
  id: number;
  event_id?: number;

  // สองทางเลือก (เลือกใช้ตามที่ backend คืนมา)
  cloudinaryImage_id?: number;        // ตรง schema
  cloudinaryImage?: ApiCloudinaryImage;

  // เพื่อความสะดวกฝั่ง UI (ถ้า backend map ให้)
  photoUrl?: string;

  caption_TH?: string | null;
  caption_EN?: string | null;
  isMain: boolean;
  sortOrder: number;

  createdAt?: string;
  updatedAt?: string;
};

// ---------- Major Category (optional but useful) ----------
export type ApiMajorCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
  color?: string | null;
  icon?: string | null;
};

// ---------- Skill reward ----------
export type ApiEventSkillReward = {
  subSkillCategory: {
    id: number;
    name_TH: string;
    name_EN: string;
    icon?: string | null;
    color?: string | null;
    mainSkillCategory: {
      id: number;
      name_TH: string;
      name_EN: string;
      color?: string | null;
      icon?: string | null;
    };
  };
  baseExperience: number;
  bonusExperience: number;
};

// ---------- Event (Response) ----------
export type ApiEvent = {
  id: number;
  created_by: number;

  // Basic
  title_TH: string;
  title_EN: string;
  description_TH: string;
  description_EN: string;
  slug: string;

  // Capacity
  maxParticipants: number;
  currentParticipants: number;
  waitlistEnabled: boolean;

  // Staff capacity/comm
  maxStaffCount: number;
  currentStaffCount: number;
  staffCommunicationLink: string;

  walkinEnabled?: boolean | null;
  currentWalkins?: number | null;
  walkinCapacity?: number | null;

  // Year restrictions
  allowedYearLevels: number[];   // [] = ทุกชั้นปี
  staffAllowedYears: number[];   // [] = ทุกชั้นปี

  // Timing
  registrationStart: string; // ISO
  registrationEnd: string;   // ISO
  activityStart: string;     // ISO
  activityEnd: string;       // ISO

  // Check-in
  checkInStart?: string | null;
  checkInEnd?: string | null;
  lateCheckInPenalty: number;

  // Status & Priority
  status: EventStatus;
  priority: number;

  // Derived/virtual (ถ้าจะใช้ให้เป็น optional)
  isVisible?: boolean;

  // Location / Online
  location_TH: string;
  location_EN: string;
  locationMapUrl?: string | null;
  isOnline: boolean;
  meetingLink?: string | null;

  // Additional (optional)
  requirements_TH?: string | null;
  requirements_EN?: string | null;
  materials_TH?: string | null;
  materials_EN?: string | null;

  // Relations (minimal for UI)
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
  };

  majorCategory_id?: number | null;
  majorCategory?: ApiMajorCategory | null;

  photos?: ApiEventPhoto[];

  skillRewards?: ApiEventSkillReward[];

  createdAt: string;
  updatedAt: string;
};

// ---------- List response ----------
export type EventsResponse = {
  success: boolean;
  data: ApiEvent[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
};

// ---------- (ยังไม่มีใน DB) ----------
// TODO: กรณีอีเว้นเป็นแบบ Public / Private เพิ่มรายชื่อผู้เข้าร่วมมา
export type EventMode = "public" | "private";

export type Participant = {
  studentId: string;
  fullName: string;
  email: string;
  faculty: string;
};
