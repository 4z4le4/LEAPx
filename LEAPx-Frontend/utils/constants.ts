// Description: ค่าคงที่ที่ใช้ทั้งหมด

declare global {
  interface ImportMetaEnv {
    readonly VITE_LEAP_BACKEND_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const backend_url: string = import.meta.env.VITE_LEAP_BACKEND_URL;

export const Role = {
  SUPREME: "SUPREME",         // ผู้ดูแลระบบสูงสุด
  SKILL_ADMIN: "SKILL_ADMIN", // แอดมินของกลุ่มทักษะเฉพาะด้าน
  ACTIVITY_ADMIN: "ACTIVITY_ADMIN",     // ผู้ดูแลกิจกรรม
  STUDENT: "STUDENT",         // นักเรียน
  ALUMNI: "ALUMNI",           // ศิษย์เก่า
  USER: "USER",               // ผู้ใช้ทั่วไป
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES = [
  { id: 1, name: Role.USER },
  { id: 2, name: Role.ALUMNI },
  { id: 3, name: Role.STUDENT },
  { id: 4, name: Role.ACTIVITY_ADMIN },
  { id: 5, name: Role.SKILL_ADMIN },
  { id: 6, name: Role.SUPREME },
];

export const ROLE_ID = {
  USER: 1,
  ALUMNI: 2,
  STUDENT: 3,
  ACTIVITY_ADMIN: 4,
  SKILL_ADMIN: 5,
  SUPREME: 6,
};