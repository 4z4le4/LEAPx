/**
 * Types for Check-In/Check-Out System
 * โครงสร้างข้อมูลสำหรับระบบเช็คอินเช็คเอ้าท์
 */

export type LevelType = "I" | "II" | "III" | "IV";

export type CheckInAction = "checkin" | "checkout";

/**
 * Request สำหรับสร้าง Check-In Time Slot
 */
export interface CreateCheckInTimeSlotRequest {
    event_id: number;
    startTime: string;  // ISO 8601 format
    endTime: string;    // ISO 8601 format
    slot_number: number;
    name_TH?: string;
    name_EN?: string;
    description_TH?: string;
    description_EN?: string;
    earlyCheckInMinutes?: number | null;  // null = ใช้ event.checkInWindowBefore, 0 = ไม่มี early check-in, N = อนุญาตก่อนเวลา N นาที
    
    // Skill rewards สำหรับ slot นี้ (optional)
    skillRewards?: CreateTimeSlotSkillRewardRequest[];
}

/**
 * Request สำหรับอัพเดท Check-In Time Slot
 */
export interface UpdateCheckInTimeSlotRequest {
    id: number;
    startTime?: string;
    endTime?: string;
    slot_number?: number;
    name_TH?: string;
    name_EN?: string;
    description_TH?: string;
    description_EN?: string;
    earlyCheckInMinutes?: number | null;  // null = ใช้ event.checkInWindowBefore, 0 = ไม่มี early check-in, N = อนุญาตก่อนเวลา N นาที
}

/**
 * Request สำหรับสร้าง Skill Reward ให้กับ Time Slot
 */
export interface CreateTimeSlotSkillRewardRequest {
    subSkillCategory_id: number;
    levelType: LevelType;
    baseExperience: number;
    bonusExperience?: number;
    requireCheckIn?: boolean;
    requireCheckOut?: boolean;
    requireOnTime?: boolean;
}

/**
 * Request สำหรับอัพเดท Skill Reward ของ Time Slot
 */
export interface UpdateTimeSlotSkillRewardRequest {
    id: number;
    baseExperience?: number;
    bonusExperience?: number;
    requireCheckIn?: boolean;
    requireCheckOut?: boolean;
    requireOnTime?: boolean;
}

/**
 * Request สำหรับ Auto Check-In/Out
 * ระบบจะกำหนด action เอง (checkin/checkout) ตามเวลาปัจจุบัน
 */
export interface AutoCheckInOutRequest {
    eventId: number;
    userId?: number;
    qrCode?: string;
}

/**
 * Request สำหรับ Manual Check-In/Out
 * ระบุ action ชัดเจนว่าต้องการ checkin หรือ checkout
 */
export interface ManualCheckInOutRequest {
    eventId: number;
    userId?: number;
    qrCode?: string;
    action: CheckInAction;
    slotId?: number;  // สำหรับกรณีที่ต้องการระบุ slot เฉพาะ
}

/**
 * Request สำหรับ Staff Check-In/Out
 */
export interface StaffCheckInOutRequest {
    eventId: number;
    action: CheckInAction;
    userId: number;
}

/**
 * ข้อมูลสำหรับคำนวณ EXP
 */
export interface ExpCalculationData {
    checkInTimeSlot_id: number;
    checkedIn: boolean;
    checkedOut: boolean;
    isLate: boolean;
    checkInTime?: Date;
    checkOutTime?: Date;
}

/**
 * ผลลัพธ์การคำนวณ EXP
 */
export interface ExpCalculationResult {
    totalExp: number;
    skillRewards: Array<{
        subSkillCategory_id: number;
        levelType: LevelType;
        expEarned: number;
        baseExperience: number;
        bonusExperience: number;
        reason_TH: string;
        reason_EN: string;
    }>;
    penalties: Array<{
        reason_TH: string;
        reason_EN: string;
        expLost: number;
    }>;
}

/**
 * Response สำหรับ Check-In/Out
 */
export interface CheckInOutResponse {
    success: boolean;
    action: CheckInAction;
    mode: "single" | "multiple";
    isAutomatic: boolean;
    message: string;
    data: {
        userId: number;
        eventId?: number;
        slot?: {
            id: number;
            slot_number: number;
            startTime: Date;
            endTime: Date;
        };
        checkInTime?: Date;
        checkOutTime?: Date;
        isLate?: boolean;
        expEarned?: number;
        totalSlotsCheckedIn?: number;
        totalSlots?: number;
        absentSlots?: number;
    };
}

/**
 * Response สำหรับดู Check-In status ของ user
 */
export interface CheckInStatusResponse {
    userId: number;
    eventId: number;
    registration: {
        status: string;
        checkedIn: boolean;
        checkedOut: boolean;
        checkInTime?: Date;
        checkOutTime?: Date;
    };
    slots: Array<{
        id: number;
        slot_number: number;
        startTime: Date;
        endTime: Date;
        name_TH?: string;
        name_EN?: string;
        checkedIn: boolean;
        checkedOut: boolean;
        checkInTime?: Date;
        checkOutTime?: Date;
        isLate: boolean;
        expEarned: number;
        skillRewards?: Array<{
            subSkillCategory_id: number;
            levelType: LevelType;
            baseExperience: number;
            bonusExperience: number;
        }>;
    }>;
    totalExpEarned: number;
    completionRate: number;
}

/**
 * Time Slot Config สำหรับ Event
 */
export interface TimeSlotConfiguration {
    allowMultipleCheckIns: boolean;
    lateCheckInPenalty: number;  // นาที
    timeSlots: Array<{
        slot_number: number;
        startTime: string;
        endTime: string;
        name_TH?: string;
        name_EN?: string;
        description_TH?: string;
        description_EN?: string;
        skillRewards: Array<{
            subSkillCategory_id: number;
            levelType: LevelType;
            baseExperience: number;
            bonusExperience?: number;
            requireCheckIn?: boolean;
            requireCheckOut?: boolean;
            requireOnTime?: boolean;
        }>;
    }>;
}

/**
 * Bulk Check-In Request สำหรับ Staff
 */
export interface BulkCheckInRequest {
    eventId: number;
    userIds: number[];
    action: CheckInAction;
    slotId?: number;
}

/**
 * Bulk Check-In Response
 */
export interface BulkCheckInResponse {
    success: boolean;
    totalProcessed: number;
    successful: number;
    failed: number;
    results: Array<{
        userId: number;
        success: boolean;
        message: string;
        error?: string;
    }>;
}
