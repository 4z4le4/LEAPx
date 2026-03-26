import type { Chip } from "../common";

export type SkillBadge = {
  id: number;            // subSkillCategory_id
  label: string;         // Main skill (TH/EN)
  subLabel?: string;     // Sub skill (TH/EN)
  color?: string | null; // mainSkillCategory.color
  icon?: string | null;  // mainSkillCategory.icon
};

export type EventDetail = {
  id: string;
  slug: string;          // ใช้สำหรับ /activities/:slug
  title: string;
  description: string;

  dateText: string;
  timeText: string;
  venueText: string;

  coverUrl: string | null;
  chips?: Chip[];

  lat?: number | null;
  lng?: number | null;
  addressForMap?: string | null;

  skillBadges?: SkillBadge[];

  participants: { current: number; max: number };
  staff: { current: number; max: number };

  canRegisterOnsite: boolean;
  canRegisterOnline: boolean;
};