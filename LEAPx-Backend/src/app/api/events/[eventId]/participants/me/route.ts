import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withUserAuth(req, async (req: NextRequest) => {
        try {
            const userId = getUserId(req);
            if (userId instanceof NextResponse) {
                return addCorsHeaders(userId, req);
            }
            const eventId = parseInt((await context.params).eventId);
            if (isNaN(eventId)) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Invalid event ID" }, { status: 400 }),
                    req
                );
            }

            // ดึง event
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                select: {
                    id: true,
                    title_TH: true,
                    title_EN: true,
                    slug: true,
                    status: true,
                    activityStart: true,
                    activityEnd: true,
                    allowMultipleCheckIns: true,
                },
            });

            if (!event) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Event not found" }, { status: 404 }),
                    req
                );
            }

            // ดึง registration ของผู้ใช้ในกิจกรรมนี้
            const registration = await prisma.eventRegistration.findUnique({
                where: {
                    user_id_event_id: {
                        user_id: userId,
                        event_id: eventId,
                    },
                },
                select: {
                    id: true,
                    status: true,
                    registrationType: true,
                    checkedIn: true,
                    checkInTime: true,
                    checkedOut: true,
                    checkOutTime: true,
                    experienceEarned: true,
                    hasEvaluated: true,
                    createdAt: true,
                    updatedAt: true,
                    checkInRecords: {
                        select: {
                            id: true,
                            checkedIn: true,
                            checkInTime: true,
                            checkedOut: true,
                            checkOutTime: true,
                            isLate: true,
                            expEarned: true,
                            checkInTimeSlot: {
                                select: {
                                    id: true,
                                    slot_number: true,
                                    startTime: true,
                                    endTime: true,
                                    name_TH: true,
                                    name_EN: true,
                                },
                            },
                        },
                        orderBy: { checkInTimeSlot: { slot_number: "asc" } },
                    },
                },
            });

            if (!registration) {
                return addCorsHeaders(
                    NextResponse.json(
                        { error: "You are not registered for this event" },
                        { status: 404 }
                    ),
                    req
                );
            }

            // ดึง ExperienceHistory ของผู้ใช้สำหรับกิจกรรมนี้
            const expHistories = await prisma.experienceHistory.findMany({
                where: {
                    activity_id: eventId,
                    user_id: userId,
                },
                include: {
                    subSkillCategory: {
                        select: {
                            id: true,
                            name_TH: true,
                            name_EN: true,
                            slug: true,
                            icon: true,
                            color: true,
                            mainSkillCategory: {
                                select: {
                                    id: true,
                                    name_TH: true,
                                    name_EN: true,
                                    slug: true,
                                    icon: true,
                                    color: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            });

            const skills = expHistories.map((exp) => ({
                skillId:           exp.subSkillCategory.id,
                skillName_TH:      exp.subSkillCategory.name_TH,
                skillName_EN:      exp.subSkillCategory.name_EN,
                skillSlug:         exp.subSkillCategory.slug,
                skillIcon:         exp.subSkillCategory.icon,
                skillColor:        exp.subSkillCategory.color,
                mainSkillId:       exp.subSkillCategory.mainSkillCategory.id,
                mainSkillName_TH:  exp.subSkillCategory.mainSkillCategory.name_TH,
                mainSkillName_EN:  exp.subSkillCategory.mainSkillCategory.name_EN,
                mainSkillSlug:     exp.subSkillCategory.mainSkillCategory.slug,
                mainSkillIcon:     exp.subSkillCategory.mainSkillCategory.icon,
                mainSkillColor:    exp.subSkillCategory.mainSkillCategory.color,
                levelType:         exp.newLevel,
                previousLevel:     exp.previousLevel,
                expEarned:         exp.experienceGained,
                expType:           exp.type,
                earnedAt:          exp.createdAt,
            }));

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    data: {
                        event: {
                            id:                    event.id,
                            title_TH:              event.title_TH,
                            title_EN:              event.title_EN,
                            slug:                  event.slug,
                            status:                event.status,
                            activityStart:         event.activityStart,
                            activityEnd:           event.activityEnd,
                            allowMultipleCheckIns: event.allowMultipleCheckIns,
                        },
                        participation: {
                            registrationId:   registration.id,
                            status:           registration.status,
                            statusDate:       registration.updatedAt,
                            registrationType: registration.registrationType,
                            checkedIn:        registration.checkedIn,
                            checkInTime:      registration.checkInTime,
                            checkedOut:       registration.checkedOut,
                            checkOutTime:     registration.checkOutTime,
                            totalExpEarned:   registration.experienceEarned,
                            hasEvaluated:     registration.hasEvaluated,
                            registeredAt:     registration.createdAt,
                            checkInRecords:   registration.checkInRecords.map((r) => ({
                                slotId:       r.checkInTimeSlot.id,
                                slotNumber:   r.checkInTimeSlot.slot_number,
                                slotStart:    r.checkInTimeSlot.startTime,
                                slotEnd:      r.checkInTimeSlot.endTime,
                                slotName_TH:  r.checkInTimeSlot.name_TH,
                                slotName_EN:  r.checkInTimeSlot.name_EN,
                                checkedIn:    r.checkedIn,
                                checkInTime:  r.checkInTime,
                                checkedOut:   r.checkedOut,
                                checkOutTime: r.checkOutTime,
                                isLate:       r.isLate,
                                expEarned:    r.expEarned,
                            })),
                            skills,
                        },
                    },
                })),
                req
            );
        } catch (error) {
            console.error("GET /participants/me error:", error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            return addCorsHeaders(
                NextResponse.json(
                    { error: "Failed to fetch your participation info", details: msg },
                    { status: 500 }
                ),
                req
            );
        }
    });
}
