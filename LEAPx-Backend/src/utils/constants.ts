// Description: ค่าคงที่ที่ใช้ทั้งหมด

export enum Role {
  SUPREME = "SUPREME",         // ผู้ดูแลระบบสูงสุด
  SKILL_ADMIN = "SKILL_ADMIN", // แอดมินของกลุ่มทักษะเฉพาะด้าน
  ACTIVITY_ADMIN = "ACTIVITY_ADMIN",     // ผู้ดูแลกิจกรรม
  STUDENT = "STUDENT",         // นักเรียน
  ALUMNI = "ALUMNI",           // ศิษย์เก่า
  USER = "USER",               // ผู้ใช้ทั่วไป
}

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

export const ROLE_NAME = {
    USER: Role.USER,
    ALUMNI: Role.ALUMNI,
    STUDENT: Role.STUDENT,
    ACTIVITY_ADMIN: Role.ACTIVITY_ADMIN,
    SKILL_ADMIN: Role.SKILL_ADMIN,
    SUPREME: Role.SUPREME,
};

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_SECRET_ENCODED = new TextEncoder().encode(JWT_SECRET);