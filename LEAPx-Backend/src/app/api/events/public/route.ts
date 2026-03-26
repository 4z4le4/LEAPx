import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        const search = searchParams.get('search') || undefined;
        const isOnline = searchParams.get('isOnline') ? searchParams.get('isOnline') === 'true' : undefined;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const sortBy = searchParams.get('sortBy') || 'activityStart';
        const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
        const mainSkillId = searchParams.get('mainSkillId') ? parseInt(searchParams.get('mainSkillId')!) : undefined;

        const now = new Date();
        
        const whereClause: Record<string, unknown> = {
            status: 'PUBLISHED',
        };

        // Filter events: only show past events within last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        whereClause.OR = [
            // Events that haven't ended yet
            { activityEnd: { gte: now } },
            // Events that ended within the last 7 days
            { 
                AND: [
                    { activityEnd: { lt: now } },
                    { activityEnd: { gte: sevenDaysAgo } }
                ]
            }
        ];
        
        // Filter by online/offline
        if (isOnline !== undefined) {
            whereClause.isOnline = isOnline;
        }
        
        // Search in title and description
        if (search) {
            whereClause.AND = [
                ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
                {
                    OR: [
                        { title_TH: { contains: search, mode: 'insensitive' } },
                        { title_EN: { contains: search, mode: 'insensitive' } },
                        { description_TH: { contains: search, mode: 'insensitive' } },
                        { description_EN: { contains: search, mode: 'insensitive' } },
                        // category
                        {
                            majorCategory: {
                                OR:[
                                    { name_TH: { contains: search, mode: 'insensitive' } },
                                    { name_EN: { contains: search, mode: 'insensitive' } },
                                    { code: { contains: search, mode: 'insensitive' } },
                                ]
                            }
                        }
                    ]
                }
            ];
        }

        // Filter by main skill category
        if (mainSkillId) {
            whereClause.skillRewards = {
                some: {
                    subSkillCategory: {
                        mainSkillCategory_id: mainSkillId
                    }
                }
            };
        }

        const skip = (page - 1) * limit;
        const take = limit;

        const totalCount = await prisma.event.count({ where: whereClause });

        const events = await prisma.event.findMany({
            where: whereClause,
            select: {
                id: true,
                slug: true,
                title_TH: true,
                title_EN: true,
                description_TH: true,
                description_EN: true,
                majorCategory :{
                    select: { id: true, name_TH: true, name_EN: true , code: true}
                },
                waitlistEnabled: true,
                
                maxParticipants: true,
                currentParticipants: true,

                maxStaffCount: true,
                currentStaffCount: true,
                staffCommunicationLink: true,
                
                registrationStart: true,
                registrationEnd: true,
                activityStart: true,
                activityEnd: true,
                
                location_TH: true,
                location_EN: true,
                isOnline: true,

                isForCMUEngineering: true,
                allowedYearLevels: true,
                staffAllowedYears: true,
                walkinEnabled: true,
                
                priority: true,
                
                photos: {
                    where: { isMain: true },
                    take: 1,
                    include: {
                        cloudinaryImage: {
                            select: {
                                secureUrl: true,
                            }
                        }
                    }
                },
                
                // Skill rewards (active only)
                skillRewards: {
                    select: {
                        id: true,
                        baseExperience: true,
                        bonusExperience: true,
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
                                        icon: true,
                                        color: true,
                                    }
                                }
                            }
                        }
                    }
                },
                
                // Count registrations
                _count: {
                    select: {
                        registrations: true,
                    }
                }
            },
            orderBy: { [sortBy]: sortOrder },
            skip,
            take,
        });

        // Process events to add computed fields
        const processedEvents = events.map(event => {
            const availableSlots = Math.max(0, event.maxParticipants - event.currentParticipants);
            const isRegistrationOpen = 
                now >= event.registrationStart && 
                now <= event.registrationEnd;
            const isEventOngoing = 
                now >= event.activityStart && 
                now <= event.activityEnd;
            const isEventPast = now > event.activityEnd;
            const totalExpReward = event.skillRewards.reduce(
                (sum, reward) => sum + reward.baseExperience + reward.bonusExperience,
                0
            );

            // Transform photos to URL (main photo only)
            const mainPhotoUrl = event.photos.length > 0 
                ? event.photos[0].cloudinaryImage.secureUrl
                : null;

            return {
                ...event,
                photos: mainPhotoUrl ? [mainPhotoUrl] : [], 
                availableSlots,
                isFull: availableSlots === 0,
                totalExpReward,
                state: {
                    isRegistrationOpen,
                    isEventOngoing,
                    isEventPast,
                }
            };
        });

        const availableCategories = events
            .filter(event => event.majorCategory !== null)
            .map(event => event.majorCategory!)
            .reduce((unique, category) => {
                if(!unique.some(cat => cat.id === category.id)){
                    unique.push(category);
                }
                return unique;
            }, [] as Array<{id: number; name_TH: string; name_EN: string; code: string}>);
            
        const response = NextResponse.json(transformDatesToThai({
            success: true,
            data: processedEvents,
            availableCategories,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        }));
        return addCorsHeaders(response, req);

    } catch (error) {
        console.error("Get public events error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const response = NextResponse.json(
            { error: "Failed to fetch events", details: errorMessage },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
    }
}