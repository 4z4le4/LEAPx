import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> }
) {
    try {
        const slug = (await context.params).slug;

        if (!slug) {
            const response = NextResponse.json(
                { error: "Slug is required" },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        const currentUserId = await getUserId(req);

        const event = await prisma.event.findUnique({
            where: { slug },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        photo: true,
                        faculty: true,
                        major: true
                    }
                },
                majorCategory: {
                    select: { id: true, name_TH: true, name_EN: true, code: true }
                },
                photos: {
                    include: {
                        cloudinaryImage: {
                            select: {
                                url: true,
                            }
                        }
                    },
                    orderBy: [
                        { isMain: 'desc' },
                        { sortOrder: 'asc' }
                    ]
                },
                // Staff
                staffAssignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                photo: true
                            }
                        }
                    },
                    orderBy: { assignedAt: 'asc' }
                },
                
                // Skill Rewards
                skillRewards: {
                    include: {
                        subSkillCategory: {
                            include: {
                                mainSkillCategory: {
                                    select: {
                                        id: true,
                                        name_EN: true,
                                        name_TH: true,
                                        color: true,
                                        icon: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                // Prerequisites
                prerequisites: {
                    include: {
                        event: {
                            select: {
                                id: true,
                                title_EN: true,
                                title_TH: true,
                                slug: true
                            }
                        }
                    }
                },
                // Registration count
                registrations: {
                    select: {
                        id: true,
                        status: true,
                        user_id: true  
                    }
                },
                checkInTimeSlots: {
                    include: {
                        skillRewards: {
                            include: {
                                subSkillCategory: {
                                    include: {
                                        mainSkillCategory: {
                                            select: {
                                                id: true,
                                                name_EN: true,
                                                name_TH: true,
                                                color: true,
                                                icon: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { slot_number: 'asc' }
                }
            }
        });

        if (!event) {
            const response = NextResponse.json(
                { error: "Event not found" },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        let userParticipationStatus = null;
        
        if (currentUserId) {
            const userRegistration = event.registrations.find(
                r => r.user_id === currentUserId
            );

            const userStaffAssignment = event.staffAssignments.find(
                s => s.user_id === currentUserId
            );

            userParticipationStatus = {
                isRegistered: !!userRegistration,
                isStaff: !!userStaffAssignment,
                registrationStatus: userRegistration?.status || null,
                staffStatus: userStaffAssignment?.status || null,
                staffRole: userStaffAssignment ? {
                    id: userStaffAssignment.StaffRole_id,
                    responsibilities_TH: userStaffAssignment.responsibilities_TH,
                    responsibilities_EN: userStaffAssignment.responsibilities_EN
                } : null
            };
        }

        const registrationStats = {
            total: event.registrations.length,
            registered: event.registrations.filter(r => r.status === 'REGISTERED').length,
            attended: event.registrations.filter(r => r.status === 'ATTENDED').length,
            completed: event.registrations.filter(r => r.status === 'COMPLETED').length,
            cancelled: event.registrations.filter(r => r.status === 'CANCELLED').length,
            waitlist: event.registrations.filter(r => r.status === 'PENDING').length
        };

        const now = new Date();
        const isRegistrationOpen = true 

        
        // console.log("registrationsStart" , event.registrationStart)
        // console.log("registartionsEnd", event.registrationEnd)
        // console.log("opne", isRegistrationOpen)

        const isEventOngoing = 
            now >= event.activityStart && 
            now <= event.activityEnd;

        const isEventPast = now > event.activityEnd;

        const availableSlots = Math.max(
            0,
            event.maxParticipants - event.currentParticipants
        );

        const photoUrls = event.photos
            .map((photo: { id: number; cloudinaryImage: { url: string } | null }) => ({
                id: photo.id,
                url: photo.cloudinaryImage?.url ?? null
            }))
            .filter((p): p is { id: number; url: string } => typeof p.url === "string");

        const eventData = {
            ...event,
            photos: photoUrls,  
            registrations: undefined, 
            registrationStats,
            state: {
                isRegistrationOpen: isRegistrationOpen ? true : false,
                isEventOngoing,
                isEventPast,
                isFull: availableSlots === 0,
            },
            totalExpReward: event.skillRewards.reduce(
                (sum, reward) => sum + reward.baseExperience + reward.bonusExperience,
                0
            ),
            currentUserStatus: userParticipationStatus
        };

        const response = NextResponse.json(transformDatesToThai({
            success: true,
            data: eventData
        }));
        
        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Get event by slug error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
            { error: "Failed to fetch event", details: errorMessage },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
}