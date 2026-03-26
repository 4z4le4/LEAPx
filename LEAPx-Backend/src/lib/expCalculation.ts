/**
 * Experience Calculation Helper Functions
 * ฟังก์ชันช่วยคำนวณ EXP สำหรับระบบเช็คอินเช็คเอ้าท์
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { 
    ExpCalculationData, 
    ExpCalculationResult,
    LevelType
} from "@/types/checkInTypes";
import type { 
    UserSubSkillLevel
} from "@prisma/client";

// Type for Prisma Transaction Client
type PrismaTransaction = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * คำนวณ EXP ที่ได้จาก Time Slot
 * ดูว่า user เช็คอิน-เช็คเอ้าท์ครบถ้วนตาม requirements หรือไม่
 */
export async function calculateSlotExp(
    checkInTimeSlot_id: number,
    calculationData: ExpCalculationData
): Promise<ExpCalculationResult> {
    
    // ดึงข้อมูล skill rewards ของ slot นี้
    const skillRewards = await prisma.checkInTimeSlotSkillReward.findMany({
        where: { 
            checkInTimeSlot_id 
        },
        include: {
            subSkillCategory: {
                include: {
                    mainSkillCategory: true
                }
            }
        }
    });

    let totalExp = 0;
    const earnedRewards: ExpCalculationResult["skillRewards"] = [];
    const penalties: ExpCalculationResult["penalties"] = [];

    for (const reward of skillRewards) {
        let expEarned = 0;
        let shouldAwardExp = true;
        let reason_TH = "";
        let reason_EN = "";

        // ตรวจสอบเงื่อนไขการให้ EXP
        
        // 1. ต้องเช็คอินหรือไม่
        if (reward.requireCheckIn && !calculationData.checkedIn) {
            shouldAwardExp = false;
            reason_TH = "ไม่ได้เช็คอิน";
            reason_EN = "Did not check in";
        }

        // 2. ต้องเช็คเอ้าท์หรือไม่
        if (reward.requireCheckOut && !calculationData.checkedOut) {
            shouldAwardExp = false;
            reason_TH = "ไม่ได้เช็คเอ้าท์";
            reason_EN = "Did not check out";
        }

        // 3. ต้องมาตรงเวลาหรือไม่ (ไม่สาย)
        if (reward.requireOnTime && calculationData.isLate) {
            shouldAwardExp = false;
            reason_TH = "มาสาย";
            reason_EN = "Late arrival";
        }

        // คำนวณ EXP ที่ได้
        if (shouldAwardExp) {
            expEarned = reward.baseExperience + (reward.bonusExperience || 0);
            
            if (calculationData.isLate) {
                reason_TH = "เข้าร่วมกิจกรรม (มาสาย)";
                reason_EN = "Attended activity (late)";
            } else {
                reason_TH = "เข้าร่วมกิจกรรมครบถ้วน";
                reason_EN = "Fully attended activity";
            }
        }

        totalExp += expEarned;

        earnedRewards.push({
            subSkillCategory_id: reward.subSkillCategory_id,
            levelType: reward.levelType as LevelType,
            expEarned,
            baseExperience: reward.baseExperience,
            bonusExperience: reward.bonusExperience || 0,
            reason_TH,
            reason_EN
        });
    }

    return {
        totalExp,
        skillRewards: earnedRewards,
        penalties
    };
}

/**
 * คำนวณ EXP รวมจากทุก Time Slots ของ Event
 */
export async function calculateEventTotalExp(
    event_id: number,
    userId: number
): Promise<ExpCalculationResult> {
    
    // ดึงข้อมูล registration และ check-in records
    const registration = await prisma.eventRegistration.findUnique({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id
            }
        },
        include: {
            checkInRecords: {
                include: {
                    checkInTimeSlot: {
                        include: {
                            skillRewards: {
                                include: {
                                    subSkillCategory: {
                                        include: {
                                            mainSkillCategory: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    checkInTimeSlot: {
                        slot_number: 'asc'
                    }
                }
            }
        }
    });

    if (!registration) {
        throw new Error("REGISTRATION_NOT_FOUND");
    }

    let totalExp = 0;
    const allSkillRewards: ExpCalculationResult["skillRewards"] = [];
    const penalties: ExpCalculationResult["penalties"] = [];

    // คำนวณ EXP จากแต่ละ slot
    for (const record of registration.checkInRecords) {
        const slotResult = await calculateSlotExp(
            record.checkInTimeSlot_id,
            {
                checkInTimeSlot_id: record.checkInTimeSlot_id,
                checkedIn: record.checkedIn,
                checkedOut: record.checkedOut,
                isLate: record.isLate,
                checkInTime: record.checkInTime || undefined,
                checkOutTime: record.checkOutTime || undefined
            }
        );

        totalExp += slotResult.totalExp;
        allSkillRewards.push(...slotResult.skillRewards);
        penalties.push(...slotResult.penalties);
    }

    // รวม EXP ตาม subSkillCategory และ levelType
    const aggregatedRewards = aggregateSkillRewards(allSkillRewards);

    return {
        totalExp,
        skillRewards: aggregatedRewards,
        penalties
    };
}

/**
 * รวม Skill Rewards ตาม subSkillCategory_id และ levelType
 */
function aggregateSkillRewards(
    rewards: ExpCalculationResult["skillRewards"]
): ExpCalculationResult["skillRewards"] {
    
    const aggregated = new Map<string, ExpCalculationResult["skillRewards"][0]>();

    for (const reward of rewards) {
        const key = `${reward.subSkillCategory_id}_${reward.levelType}`;
        
        if (aggregated.has(key)) {
            const existing = aggregated.get(key)!;
            existing.expEarned += reward.expEarned;
            existing.baseExperience += reward.baseExperience;
            existing.bonusExperience += reward.bonusExperience;
        } else {
            aggregated.set(key, { ...reward });
        }
    }

    return Array.from(aggregated.values());
}

/**
 * บันทึก EXP ลงในระบบ
 * Update UserSubSkillLevel และสร้าง ExperienceHistory
 * @param txClient - ถ้าส่งมาจะใช้ transaction ที่มีอยู่ ถ้าไม่ส่งจะสร้าง transaction ใหม่
 */
export async function awardSkillExp(
    userId: number,
    event_id: number,
    skillRewards: ExpCalculationResult["skillRewards"],
    txClient?: PrismaTransaction
): Promise<void> {
    
    const processExp = async (tx: PrismaTransaction) => {
        for (const reward of skillRewards) {
            if (reward.expEarned <= 0) continue;

            // ดึงข้อมูล level threshold
            const levelThresholds = await tx.levelThreshold.findMany({
                orderBy: { sortOrder: 'asc' }
            });

            // ดึงหรือสร้าง UserSubSkillLevel
            let userSkillLevel = await tx.userSubSkillLevel.findUnique({
                where: {
                    user_id_subSkillCategory_id: {
                        user_id: userId,
                        subSkillCategory_id: reward.subSkillCategory_id
                    }
                }
            });

            const previousLevel = userSkillLevel?.currentLevel || 0;
            const previousExp = userSkillLevel?.totalExp || 0;

            if (!userSkillLevel) {
                userSkillLevel = await tx.userSubSkillLevel.create({
                    data: {
                        user_id: userId,
                        subSkillCategory_id: reward.subSkillCategory_id,
                        totalExp: 0,
                        currentLevel: 0,
                        Level_I_exp: 0,
                        Level_II_exp: 0,
                        Level_III_exp: 0,
                        Level_IV_exp: 0,
                        Level_I_stars: 0,
                        Level_II_stars: 0,
                        Level_III_stars: 0,
                        Level_IV_stars: 0
                    }
                });
            }

            // อัพเดท EXP ตาม levelType
            const updateData: Prisma.UserSubSkillLevelUpdateInput = {
                totalExp: { increment: reward.expEarned }
            };

            // เพิ่ม EXP ให้กับ level ที่เหมาะสม
            switch (reward.levelType) {
                case "I":
                    updateData.Level_I_exp = { increment: reward.expEarned };
                    break;
                case "II":
                    updateData.Level_II_exp = { increment: reward.expEarned };
                    break;
                case "III":
                    updateData.Level_III_exp = { increment: reward.expEarned };
                    break;
                case "IV":
                    updateData.Level_IV_exp = { increment: reward.expEarned };
                    break;
            }

            // คำนวณว่าได้ดาวหรือไม่
            const threshold = levelThresholds.find(
                t => t.levelType === reward.levelType
            );

            if (threshold) {
                const levelExpKey = `Level_${reward.levelType}_exp` as keyof UserSubSkillLevel;
                const levelStarsKey = `Level_${reward.levelType}_stars` as keyof UserSubSkillLevel;
                
                const currentLevelExp = (userSkillLevel[levelExpKey] as number) || 0;
                const newLevelExp = currentLevelExp + reward.expEarned;

                // ถ้า EXP ใหม่เกิน threshold ให้เพิ่มดาว
                if (newLevelExp >= threshold.expRequired) {
                    const newStars = Math.floor(newLevelExp / threshold.expRequired);
                    const currentStars = (userSkillLevel[levelStarsKey] as number) || 0;
                    
                    if (newStars > currentStars) {
                        updateData[`Level_${reward.levelType}_stars`] = newStars;
                    }
                }
            }

            // คำนวณ currentLevel ใหม่ (ดูว่า level ไหนมีดาวสูงสุด)
            const updatedLevel = await tx.userSubSkillLevel.update({
                where: {
                    user_id_subSkillCategory_id: {
                        user_id: userId,
                        subSkillCategory_id: reward.subSkillCategory_id
                    }
                },
                data: updateData
            });

            const newCurrentLevel = calculateCurrentLevel(updatedLevel);
            
            if (newCurrentLevel !== updatedLevel.currentLevel) {
                await tx.userSubSkillLevel.update({
                    where: { id: updatedLevel.id },
                    data: { currentLevel: newCurrentLevel }
                });
            }

            const newLevel = newCurrentLevel;
            const newExp = previousExp + reward.expEarned;

            // สร้าง ExperienceHistory
            await tx.experienceHistory.create({
                data: {
                    user_id: userId,
                    activity_id: event_id,
                    subSkillCategory_id: reward.subSkillCategory_id,
                    experienceGained: reward.expEarned,
                    reason_TH: reward.reason_TH,
                    reason_EN: reward.reason_EN,
                    type: "ACTIVITY_COMPLETION",
                    previousLevel,
                    newLevel,
                    previousExp,
                    newExp,
                    bonusApplied: reward.bonusExperience > 0
                }
            });

            // อัพเดท UserMainSkillLevel
            await updateMainSkillLevel(tx, userId, reward.subSkillCategory_id);
        }
    };

    if (txClient) {
        // ใช้ transaction ที่มีอยู่
        await processExp(txClient);
    } else {
        // สร้าง transaction ใหม่
        await prisma.$transaction(async (tx) => {
            await processExp(tx);
        });
    }
}

/**
 * คำนวณ currentLevel จากจำนวนดาวที่มี
 */
function calculateCurrentLevel(userSkillLevel: UserSubSkillLevel): number {
    if (userSkillLevel.Level_IV_stars > 0) return 4;
    if (userSkillLevel.Level_III_stars > 0) return 3;
    if (userSkillLevel.Level_II_stars > 0) return 2;
    if (userSkillLevel.Level_I_stars > 0) return 1;
    return 0;
}

/**
 * อัพเดท UserMainSkillLevel
 */
async function updateMainSkillLevel(
    tx: PrismaTransaction,
    userId: number,
    subSkillCategory_id: number
): Promise<void> {
    
    // ดึงข้อมูล SubSkillCategory เพื่อหา mainSkillCategory_id
    const subSkill = await tx.subSkillCategory.findUnique({
        where: { id: subSkillCategory_id },
        select: { mainSkillCategory_id: true }
    });

    if (!subSkill) return;

    // ดึงข้อมูล sub skills ทั้งหมดของ main skill นี้
    const allSubSkills = await tx.subSkillCategory.findMany({
        where: {
            mainSkillCategory_id: subSkill.mainSkillCategory_id,
            isActive: true
        },
        select: { id: true }
    });

    // ดึงข้อมูล level ของ user ใน sub skills เหล่านี้
    const userSubSkillLevels = await tx.userSubSkillLevel.findMany({
        where: {
            user_id: userId,
            subSkillCategory_id: {
                in: allSubSkills.map(s => s.id)
            }
        }
    });

    // คำนวณค่าต่างๆ
    let maxLevel = 0;
    let totalExp = 0;
    let totalStars = 0;
    let Level_I_count = 0;
    let Level_II_count = 0;
    let Level_III_count = 0;
    let Level_IV_count = 0;
    let sumLevels = 0;

    for (const level of userSubSkillLevels) {
        if (level.currentLevel > maxLevel) {
            maxLevel = level.currentLevel;
        }
        
        totalExp += level.totalExp;
        totalStars += level.Level_I_stars + level.Level_II_stars + 
                      level.Level_III_stars + level.Level_IV_stars;
        sumLevels += level.currentLevel;

        if (level.Level_I_stars > 0) Level_I_count++;
        if (level.Level_II_stars > 0) Level_II_count++;
        if (level.Level_III_stars > 0) Level_III_count++;
        if (level.Level_IV_stars > 0) Level_IV_count++;
    }

    const averageLevel = userSubSkillLevels.length > 0 
        ? sumLevels / userSubSkillLevels.length 
        : 0;

    // อัพเดทหรือสร้าง UserMainSkillLevel
    await tx.userMainSkillLevel.upsert({
        where: {
            user_id_mainSkillCategory_id: {
                user_id: userId,
                mainSkillCategory_id: subSkill.mainSkillCategory_id
            }
        },
        create: {
            user_id: userId,
            mainSkillCategory_id: subSkill.mainSkillCategory_id,
            maxLevel,
            averageLevel,
            totalExp,
            totalStars,
            Level_I_count,
            Level_II_count,
            Level_III_count,
            Level_IV_count,
            lastCalculated: new Date()
        },
        update: {
            maxLevel,
            averageLevel,
            totalExp,
            totalStars,
            Level_I_count,
            Level_II_count,
            Level_III_count,
            Level_IV_count,
            lastCalculated: new Date()
        }
    });
}

/**
 * ตรวจสอบว่า user เช็คอิน-เช็คเอ้าท์ครบทุก slot หรือไม่
 */
export async function checkEventCompletion(
    event_id: number,
    userId: number
): Promise<{
    isComplete: boolean;
    completionRate: number;
    totalSlots: number;
    completedSlots: number;
    missingSlots: number[];
}> {
    
    const event = await prisma.event.findUnique({
        where: { id: event_id },
        include: {
            checkInTimeSlots: {
                orderBy: { slot_number: 'asc' }
            }
        }
    });

    if (!event) {
        throw new Error("EVENT_NOT_FOUND");
    }

    const registration = await prisma.eventRegistration.findUnique({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id
            }
        },
        include: {
            checkInRecords: true
        }
    });

    if (!registration) {
        throw new Error("REGISTRATION_NOT_FOUND");
    }

    const totalSlots = event.checkInTimeSlots.length;
    let completedSlots = 0;
    const missingSlots: number[] = [];

    for (const slot of event.checkInTimeSlots) {
        const record = registration.checkInRecords.find(
            r => r.checkInTimeSlot_id === slot.id
        );

        if (record?.checkedIn && record?.checkedOut) {
            completedSlots++;
        } else {
            missingSlots.push(slot.slot_number);
        }
    }

    const completionRate = totalSlots > 0 
        ? (completedSlots / totalSlots) * 100 
        : 0;

    return {
        isComplete: completedSlots === totalSlots,
        completionRate,
        totalSlots,
        completedSlots,
        missingSlots
    };
}
