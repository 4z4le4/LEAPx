import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth, getUserId } from "@/middleware/auth";
import { CreateEventRequest, GetEventsParams } from "@/types/EventType";
import { uploadImage } from "@/lib/cloudinary";
import { thaiToUTC, transformDatesToThai } from "@/utils/timezone";

interface UpdateEventRequest extends Partial<CreateEventRequest> {
    event_id: number;
}

interface CheckInTimeSlotInput {
    slot_number: number;
    startTime: string;
    endTime: string;
    subSkillCategory_id?: number;
    /** นาทีที่อนุญาตให้เช็คอินก่อนเวลาเริ่มรอบ
     *  null = ใช้ค่า checkInWindowBefore ของ Event
     *  0    = ไม่อนุญาตให้เช็คอินก่อนเวลา
     *  N>0  = อนุญาตให้เช็คอินก่อนเวลา N นาที
     */
    earlyCheckInMinutes?: number | null;
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
        const { searchParams } = new URL(req.url);
        const userId = await getUserId(req);
        
        const params: GetEventsParams = {
            status: searchParams.get('status') || undefined,
            isOnline: searchParams.get('isOnline') ? searchParams.get('isOnline') === 'true' : undefined,
            search: searchParams.get('search') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
            sortBy: searchParams.get('sortBy') || 'activityStart',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
            includeSkillRewards: searchParams.get('includeSkillRewards') === 'true',
            includeStats: searchParams.get('includeStats') === 'true',
            old_events: searchParams.get('old_events') === 'true',
        };

        const currentUser = await prisma.user.findUnique({
                where: { id: Number(userId) },
                include: {
                    role: true,
                    majorAdmins: {
                        where: { isActive: true },
                        select: { majorCategory_id: true }
                    }
                }
            });

            if (!currentUser) {
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

        const isSupreme = currentUser.role.name === 'SUPREME';
        const adminMajorIds = currentUser.majorAdmins.map(admin => admin.majorCategory_id);

        const whereClause: Record<string, unknown> = {};

        if (!isSupreme) {
            if (adminMajorIds.length > 0) {
                whereClause.majorCategory_id = { in: adminMajorIds };
            } else {
                whereClause.id = -1;
            }
        }
        
        if (params.status) {
            whereClause.status = params.status;
        }
        
        if (params.isOnline !== undefined) {
            whereClause.isOnline = params.isOnline;
        }
        
        if (params.old_events !== true) {
            whereClause.activityEnd = {
                gte: new Date() 
            };
        }
        
        if (params.search) {
            const searchConditions = [
                { title_TH: { contains: params.search, mode: 'insensitive' } },
                { title_EN: { contains: params.search, mode: 'insensitive' } },
                { description_TH: { contains: params.search, mode: 'insensitive' } },
                { description_EN: { contains: params.search, mode: 'insensitive' } },
            ];

            if (whereClause.OR) {
                whereClause.AND = [
                    { OR: whereClause.OR },
                    { OR: searchConditions }
                ];
                delete whereClause.OR;
            } else {
                whereClause.OR = searchConditions;
            }
        }

        const includeClause: Record<string, unknown> = {
            creator: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
            majorCategory: {
                select: {
                    id: true,
                    code: true,
                    name_TH: true,
                    name_EN: true,
                    faculty_TH: true,
                    faculty_EN: true,
                    icon: true,
                }
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
            checkInTimeSlots: {
                orderBy: { slot_number: 'asc' }
            }
        };

        if (params.includeSkillRewards) {
            includeClause.skillRewards = {
            select: {
                levelType: true
            },
            include: {
                subSkillCategory: {
                include: {
                    mainSkillCategory: {
                    select: {
                        id: true,
                        name_EN: true,
                        name_TH: true,
                        color: true,
                        icon: true,
                    }
                    }
                }
                }
            }
            };
        }

        if (params.includeStats) {
            includeClause._count = {
                select: {
                    registrations: true,
                    skillRewards: true,
                }
            };
        }

        const skip = ((params.page || 1) - 1) * (params.limit || 20);
        const take = params.limit || 20;

        const totalCount = await prisma.event.count({ where: whereClause });

        const events = await prisma.event.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { [params.sortBy || 'activityStart']: params.sortOrder || 'asc' },
            skip,
            take,
        });

        const response = NextResponse.json(transformDatesToThai({
            success: true,
            data: events,
            pagination: {
                total: totalCount,
                page: params.page || 1,
                limit: params.limit || 20,
                totalPages: Math.ceil(totalCount / (params.limit || 20)),
            },
            userPermissions: {
                isSupreme,
                adminMajorIds,
            }
        }));
        return addCorsHeaders(response, req);

        } catch (error) {
        console.error("Get events error:", error);
        const response = NextResponse.json(
            { error: "Failed to fetch events" },
            { status: 500 }
        );
        return addCorsHeaders(response, req);
        }
    });
}

export async function POST(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
        const userId = await getUserId(req);
        const formData = await req.formData();
        const title_TH = formData.get('title_TH') as string;
        const title_EN = formData.get('title_EN') as string;
        const description_TH = formData.get('description_TH') as string;
        const description_EN = formData.get('description_EN') as string;
        const location_TH = formData.get('location_TH') as string;
        const location_EN = formData.get('location_EN') as string;
        const registrationStart = formData.get('registrationStart') as string;
        const registrationEnd = formData.get('registrationEnd') as string;
        const activityStart = formData.get('activityStart') as string;
        const activityEnd = formData.get('activityEnd') as string;
        const staffCheckInTime = formData.get('staffCheckInTime') ? parseInt(formData.get('staffCheckInTime') as string) : 0;
        const staffCommunicationLink = formData.get('staffCommunicationLink') as string | null;

        const majorCategory_id = formData.get('majorCategory_id') ? parseInt(formData.get('majorCategory_id') as string) : null;

        const staffAllowedYears = formData.get('staffAllowedYears') ? JSON.parse(formData.get('staffAllowedYears') as string) : [];
        const allowedYearLevels = formData.get('allowedYearLevels') ? JSON.parse(formData.get('allowedYearLevels') as string) : [];

        const slug = formData.get('slug') as string | null;
        const waitlistEnabled = formData.get('waitlistEnabled') === 'true';
        const lateCheckInPenalty = formData.get('lateCheckInPenalty') ? parseInt(formData.get('lateCheckInPenalty') as string) : 0;
        const status = formData.get('status') as string || 'DRAFT';
        const priority = formData.get('priority') ? parseInt(formData.get('priority') as string) : 1;
        const locationMapUrl = formData.get('locationMapUrl') as string | null;
        const isOnline = formData.get('isOnline');
        const meetingLink = formData.get('meetingLink') as string | null;
        const skillRewards = formData.get('skillRewards') ? JSON.parse(formData.get('skillRewards') as string) : [];

        const maxStaffCount = formData.get('maxStaffCount') ? parseInt(formData.get('maxStaffCount') as string) : 0;
        const maxParticipants = formData.get('maxParticipants') ? parseInt(formData.get('maxParticipants') as string) : 0;
        
        const walkinEnabled = formData.get('walkinEnabled');
        const walkinCapacity = formData.get('walkinCapacity') ? parseInt(formData.get('walkinCapacity') as string) : 0;

        const imageFiles: File[] = [];
        const mainImageIndex = formData.get('mainImageIndex') ? parseInt(formData.get('mainImageIndex') as string) : 0;
            
        const isForCMUEngineering = formData.get('isForCMUEngineering');
        const isForCMUEngineering_Staff = formData.get('isForCMUEngineering_Staff');
        const allowMultipleCheckIns = 'true';
        const checkInTimeSlots = formData.get('checkInTimeSlots') 
                ? JSON.parse(formData.get('checkInTimeSlots') as string) as CheckInTimeSlotInput[]
                : [];

        for (let i = 0; i < 4; i++) {
            const file = formData.get(`image_${i}`) as File | null;
            if (file && file.size > 0) {
            imageFiles.push(file);
            }
        }

        if (!title_TH || !title_EN || !description_TH || !description_EN || 
            !location_TH || !registrationStart || !registrationEnd ||
            !activityStart || !activityEnd || !staffAllowedYears || !allowedYearLevels) {
            const response = NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        if (!majorCategory_id) {
            const response = NextResponse.json(
                { error: "Missing required field: majorCategory_id" },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        if (walkinEnabled !== undefined) {
            if(walkinEnabled !== 'true' && walkinEnabled !== 'false') {
                const response = NextResponse.json(
                    { error: "Invalid value for walkinEnabled. Must be 'true' or 'false'." },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (walkinEnabled === 'true' && walkinCapacity <= 0) {
                const response = NextResponse.json(
                    { error: "walkinCapacity must be greater than 0 when walkinEnabled is true." },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }
        }

        if (isForCMUEngineering !== undefined) {
            if(isForCMUEngineering !== 'true' && isForCMUEngineering !== 'false') {
                const response = NextResponse.json(
                    { error: "Invalid value for isForCMUEngineering. Must be 'true' or 'false'." },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }
        }

        if (isForCMUEngineering_Staff !== undefined) {
            if(isForCMUEngineering_Staff !== 'true' && isForCMUEngineering_Staff !== 'false') {
                const response = NextResponse.json(
                    { error: "Invalid value for isForCMUEngineering_Staff. Must be 'true' or 'false'." },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }
        }

        if (imageFiles.length > 4) {
            const response = NextResponse.json(
                { error: "Maximum 4 images allowed per event" },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        for (const file of imageFiles) {
            if (!file.type.startsWith('image/')) {
            const response = NextResponse.json(
                { error: `File ${file.name} must be an image` },
                { status: 400 }
            );
            return addCorsHeaders(response, req);
            }
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: {
                role: true,
                majorAdmins: {
                    where: {
                        majorCategory_id: majorCategory_id,
                        isActive: true
                    }
                }
            }
        });

        if (!user) {
            const response = NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
            return addCorsHeaders(response, req);
        }

        const isSupreme = user.role.name === 'SUPREME';
        const isMajorAdmin = user.majorAdmins.length > 0;

        if (!isSupreme && !isMajorAdmin) {
            const response = NextResponse.json(
                { error: "Unauthorized: You must be a SUPREME admin or Major Admin of this category to create events" },
                { status: 403 }
            );
            return addCorsHeaders(response, req);
        }

        const finalSlug = slug || title_EN.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const regStart = thaiToUTC(registrationStart);
        const regEnd = thaiToUTC(registrationEnd);
        const actStart = thaiToUTC(activityStart);
        const actEnd = thaiToUTC(activityEnd);

        if (regEnd < regStart) {
            const response = NextResponse.json(
            { error: "Registration end must be after registration start" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        if (actEnd < actStart) {
            const response = NextResponse.json(
            { error: "Activity end must be after activity start" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        if (actStart < regEnd) {
            const response = NextResponse.json(
            { error: "Activity start should be after registration end" },
            { status: 400 }
            );
            return addCorsHeaders(response, req);
        }

        // Upload images ก่อน transaction
        const uploadedImages: Array<{ 
            cloudinaryImageId: number;
            isMain: boolean; 
            sortOrder: number;
        }> = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            try {
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const customPublicId = `${finalSlug}-${i}-${timestamp}-${randomStr}`;

                const folder = process.env.CLOUDINARY_EVENT_FOLDER || 'events';
                
                const uploadResult = await uploadImage(file, {
                    folder: folder,
                    tags: ['event', finalSlug],
                    uploadedBy: Number(userId),
                    publicId: customPublicId, 
                });

                uploadedImages.push({
                    cloudinaryImageId: uploadResult.cloudinaryImage.id,
                    isMain: i === mainImageIndex,
                    sortOrder: i,
                });
            } catch (uploadError) {
                console.error(`Failed to upload image ${i}:`, uploadError);
            }
        }

        // ใช้ transaction สำหรับการสร้าง event และข้อมูลที่เกี่ยวข้อง
        const event = await prisma.$transaction(async (tx) => {
            // 1. ตรวจสอบ slug ซ้ำภายใน transaction (atomic check)
            const existingSlug = await tx.event.findUnique({
                where: { slug: finalSlug }
            });

            if (existingSlug) {
                throw new Error("SLUG_EXISTS");
            }

            // 2. Validate skill rewards ถ้ามี
            if (skillRewards && skillRewards.length > 0) {
                for (const reward of skillRewards) {
                    if (!reward.subSkillCategory_id || reward.baseExperience === undefined) {
                        throw new Error("Invalid skill reward data");
                    }

                    const subSkill = await tx.subSkillCategory.findUnique({
                        where: { id: reward.subSkillCategory_id }
                    });

                    if (!subSkill || !subSkill.isActive) {
                        throw new Error(`SubSkillCategory ${reward.subSkillCategory_id} not found or inactive`);
                    }
                }
            }

            // 3. สร้าง event
            const newEvent = await tx.event.create({
                data: {
                    created_by: Number(userId),
                    title_TH,
                    title_EN,
                    description_TH,
                    description_EN,
                    slug: finalSlug,
                    majorCategory_id,
                    allowedYearLevels,
                    staffAllowedYears,
                    maxParticipants,
                    maxStaffCount,
                    waitlistEnabled,
                    registrationStart: regStart,
                    registrationEnd: regEnd,
                    activityStart: actStart,
                    activityEnd: actEnd,
                    lateCheckInPenalty,
                    staffCheckInTime,
                    staffCommunicationLink: staffCommunicationLink || null,
                    status: status as never,
                    priority,
                    location_TH,
                    location_EN: location_EN || location_TH,
                    locationMapUrl,
                    isOnline : isOnline === 'true' ? true : false,
                    allowMultipleCheckIns : allowMultipleCheckIns === 'true' ? true : true,
                    meetingLink,
                    walkinEnabled: walkinEnabled === 'true' ? true : false,
                    walkinCapacity: Number(walkinCapacity),
                    isForCMUEngineering: isForCMUEngineering === 'true' ? true : false,
                    isForCMUEngineering_Staff: isForCMUEngineering_Staff === 'true' ? true : false,
                },
            });

            // 4. สร้าง check-in time slots
            if (checkInTimeSlots.length > 0) {
                await tx.checkInTimeSlot.createMany({
                    data: checkInTimeSlots.map(slot => ({
                        event_id: newEvent.id,
                        slot_number: slot.slot_number,
                        startTime: thaiToUTC(slot.startTime),
                        endTime: thaiToUTC(slot.endTime),
                        subSkillCategory_id: slot.subSkillCategory_id ?? undefined,
                        earlyCheckInMinutes: slot.earlyCheckInMinutes ?? null,
                    }))
                });
            }

            // 5. เพิ่มรูปภาพ
            if (uploadedImages.length > 0) {
                await tx.eventPhoto.createMany({
                    data: uploadedImages.map(img => ({
                        event_id: newEvent.id,
                        cloudinaryImage_id: img.cloudinaryImageId, 
                        isMain: img.isMain,
                        sortOrder: img.sortOrder,
                    }))
                });
            }

            // 6. สร้าง skill rewards
            if (skillRewards && skillRewards.length > 0) {
                await tx.eventSkillReward.createMany({
                    data: skillRewards.map((reward: { 
                        subSkillCategory_id: number; 
                        baseExperience: number; 
                        bonusExperience?: number; 
                        levelType?: string 
                    }) => ({
                        event_id: newEvent.id,
                        subSkillCategory_id: reward.subSkillCategory_id,
                        baseExperience: reward.baseExperience,
                        bonusExperience: reward.bonusExperience || 0,
                        levelType: reward.levelType || "-",
                    }))
                });
            }

            return newEvent;
        }, {
            maxWait: 5000,
            timeout: 20000,
        });
        
        const completeEvent = await prisma.event.findUnique({
            where: { id: event.id },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                },
                photos: {
                    include: {
                        cloudinaryImage: true
                    },
                    orderBy: [
                        { isMain: 'desc' },
                        { sortOrder: 'asc' }
                    ]
                },
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
                                icon: true,
                                }
                            }
                        }
                    },
                },
                
            },
            checkInTimeSlots: {
                orderBy: { slot_number: 'asc' }
            }

            }
        });

        const response = NextResponse.json(transformDatesToThai({
            success: true,
            message: "Event created successfully",
            data: completeEvent,
            imagesUploaded: uploadedImages.length
        }), { status: 201 });

        return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Create event error:", error);
            
            // Handle specific errors
            if (error instanceof Error) {
                if (error.message === "SLUG_EXISTS") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "Slug already exists. Please provide a unique slug."
                        }, { status: 409 }),
                        req
                    );
                }
                
                const response = NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                );
                return addCorsHeaders(response, req);
            }
            
            const response = NextResponse.json(
                { error: "Unknown error occurred" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}

export async function PUT(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const contentType = req.headers.get('content-type') || '';
            const isFormData = contentType.includes('multipart/form-data');
            
            let body: UpdateEventRequest & { 
                allowMultipleCheckIns?: boolean;
                isForCMUEngineering?: boolean;
                isForCMUEngineering_Staff?: boolean;
                checkInTimeSlots?: CheckInTimeSlotInput[];
            };
            const imageFiles: File[] = [];
            const allowMultipleCheckIns = true;
            let mainImageIndex: number | null = null;
            let deletePhotoIds: number[] = [];
            
            if (isFormData) {
                const formData = await req.formData();
                const eventId = formData.get('event_id');
                if (!eventId) {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Missing required field: event_id" }, { status: 400 }),
                        req
                    );
                }
                
                body = {
                    event_id: parseInt(eventId as string),
                    title_TH: formData.get('title_TH') as string | undefined,
                    title_EN: formData.get('title_EN') as string | undefined,
                    description_TH: formData.get('description_TH') as string | undefined,
                    description_EN: formData.get('description_EN') as string | undefined,
                    location_TH: formData.get('location_TH') as string | undefined,
                    location_EN: formData.get('location_EN') as string | undefined,
                    slug: formData.get('slug') as string | undefined,
                    maxParticipants: formData.get('maxParticipants') ? parseInt(formData.get('maxParticipants') as string) : undefined,
                    maxStaffCount: formData.get('maxStaffCount') ? parseInt(formData.get('maxStaffCount') as string) : undefined,
                    waitlistEnabled: formData.get('waitlistEnabled') ? formData.get('waitlistEnabled') === 'true' : undefined,
                    registrationStart: formData.get('registrationStart') as string | undefined,
                    registrationEnd: formData.get('registrationEnd') as string | undefined,
                    activityStart: formData.get('activityStart') as string | undefined,
                    activityEnd: formData.get('activityEnd') as string | undefined,
                    lateCheckInPenalty: formData.get('lateCheckInPenalty') ? parseInt(formData.get('lateCheckInPenalty') as string) : undefined,
                    staffCheckInTime: formData.get('staffCheckInTime') ? parseInt(formData.get('staffCheckInTime') as string) : undefined,
                    status: formData.get('status') as string | undefined,
                    priority: formData.get('priority') ? parseInt(formData.get('priority') as string) : undefined,
                    locationMapUrl: formData.get('locationMapUrl') as string | undefined,
                    isOnline: formData.get('isOnline') ? formData.get('isOnline') === 'true' : undefined,
                    meetingLink: formData.get('meetingLink') as string | undefined,
                    staffCommunicationLink: formData.get('staffCommunicationLink') as string | undefined,
                    staffAllowedYears: formData.get('staffAllowedYears') ? JSON.parse(formData.get('staffAllowedYears') as string) : undefined,
                    allowedYearLevels: formData.get('allowedYearLevels') ? JSON.parse(formData.get('allowedYearLevels') as string) : undefined,
                    majorCategory_id: formData.get('majorCategory_id') ? parseInt(formData.get('majorCategory_id') as string) : undefined,
                    checkInTimeSlots: formData.get('checkInTimeSlots') ? JSON.parse(formData.get('checkInTimeSlots') as string) : undefined,
                    walkinEnabled: formData.get('walkinEnabled') ? formData.get('walkinEnabled') === 'true' : undefined,
                    walkinCapacity: formData.get('walkinCapacity') ? parseInt(formData.get('walkinCapacity') as string) : undefined,
                    isForCMUEngineering: formData.get('isForCMUEngineering') ? formData.get('isForCMUEngineering') === 'true' : undefined,
                    isForCMUEngineering_Staff: formData.get('isForCMUEngineering_Staff') ? formData.get('isForCMUEngineering_Staff') === 'true' : undefined,
                    skillRewards: formData.get('skillRewards') ? JSON.parse(formData.get('skillRewards') as string) : undefined
                };

                for (let i = 0; i < 4; i++) {
                    const file = formData.get(`image_${i}`) as File | null;
                    if (file && file.size > 0) {
                        imageFiles.push(file);
                    }
                }

                if (formData.get('mainImageIndex')) {
                    mainImageIndex = parseInt(formData.get('mainImageIndex') as string);
                }

                if (formData.get('deletePhotoIds')) {
                    deletePhotoIds = JSON.parse(formData.get('deletePhotoIds') as string);
                }
                
            } else {
                body = await req.json();
            }

            if (!body.event_id) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required field: event_id" }, { status: 400 }),
                    req
                );
            }

            // Validate check-in time slots
            if (allowMultipleCheckIns && body.checkInTimeSlots) {
                // if (body.checkInTimeSlots.length === 0) {
                //     return addCorsHeaders(
                //         NextResponse.json({
                //             error: "Check-in time slots are required when multiple check-ins are enabled"
                //         }, { status: 400 }),
                //         req
                //     );
                // }

                for (const slot of body.checkInTimeSlots) {
                    if (!slot.startTime || !slot.endTime || slot.slot_number === undefined) {
                        return addCorsHeaders(
                            NextResponse.json({
                                error: "Invalid check-in time slot data"
                            }, { status: 400 }),
                            req
                        );
                    }

                    const slotStart = thaiToUTC(slot.startTime);
                    const slotEnd = thaiToUTC(slot.endTime);

                    if (slotEnd <= slotStart) {
                        return addCorsHeaders(
                            NextResponse.json({
                                error: `Check-in slot ${slot.slot_number}: End time must be after start time`
                            }, { status: 400 }),
                            req
                        );
                    }
                }
            }

            // Validate isForCMUEngineering
            if (body.isForCMUEngineering !== undefined) {
                if (typeof body.isForCMUEngineering !== 'boolean') {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Invalid value for isForCMUEngineering. Must be a boolean." }, { status: 400 }),
                        req
                    );
                }
            }

            // validate isForCMUEngineering_Staff
            if (body.isForCMUEngineering_Staff !== undefined) {
                if (typeof body.isForCMUEngineering_Staff !== 'boolean') {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Invalid value for isForCMUEngineering_Staff. Must be a boolean." }, { status: 400 }),
                        req
                    );
                }
            }

            // Upload images ก่อน transaction
            const uploadedImages: Array<{
                cloudinaryImageId: number;
                isMain: boolean;
                sortOrder: number;
            }> = [];

            // ใช้ transaction เพื่อ lock event row และทำการอัพเดทแบบ atomic
            const updated = await prisma.$transaction(async (tx) => {
                // 1. Lock event row และตรวจสอบว่ามีอยู่จริง (FOR UPDATE)
                const existing = await tx.event.findUnique({
                    where: { id: body.event_id },
                    include: {
                        photos: true
                    }
                });

                if (!existing) {
                    throw new Error("EVENT_NOT_FOUND");
                }

                // 2. ตรวจสอบสิทธิ์
                const currentUser = await tx.user.findUnique({
                    where: { id: Number(userId) },
                    include: { role: true }
                });

                if (!currentUser) {
                    throw new Error("USER_NOT_FOUND");
                }

                const isSupreme = currentUser.role.name === "SUPREME";

                if (!isSupreme) {
                    if (existing.majorCategory_id) {
                        const isMajorAdmin = await tx.majorAdmin.findFirst({
                            where: {
                                user_id: Number(userId),
                                majorCategory_id: Number(existing.majorCategory_id),
                                isActive: true
                            }
                        });

                        if (!isMajorAdmin) {
                            throw new Error("UNAUTHORIZED_UPDATE");
                        }
                    } else {
                        if (existing.created_by !== Number(userId)) {
                            throw new Error("UNAUTHORIZED_UPDATE");
                        }
                    }
                }

                // 3. ตรวจสอบ majorCategory_id ใหม่
                if (body.majorCategory_id !== undefined && body.majorCategory_id !== existing.majorCategory_id) {
                    if (!isSupreme && body.majorCategory_id !== null) {
                        const isMajorAdmin = await tx.majorAdmin.findFirst({
                            where: {
                                user_id: Number(userId),
                                majorCategory_id: body.majorCategory_id,
                                isActive: true
                            }
                        });

                        if (!isMajorAdmin) {
                            throw new Error("UNAUTHORIZED_MAJOR_CATEGORY");
                        }
                    }
                }

                // 4. ตรวจสอบ slug ซ้ำ (atomic check)
                if (body.slug && body.slug !== existing.slug) {
                    const existingSlug = await tx.event.findUnique({
                        where: { slug: body.slug }
                    });

                    if (existingSlug) {
                        throw new Error("SLUG_EXISTS");
                    }
                }

                // 5. ตรวจสอบจำนวนรูปภาพ
                if (imageFiles.length > 0) {
                    const currentPhotoCount = existing.photos.length - deletePhotoIds.length;
                    const totalPhotos = currentPhotoCount + imageFiles.length;
                    
                    if (totalPhotos > 4) {
                        throw new Error(`PHOTO_LIMIT_EXCEEDED:${currentPhotoCount}:${imageFiles.length}`);
                    }

                    for (const file of imageFiles) {
                        if (!file.type.startsWith('image/')) {
                            throw new Error(`INVALID_IMAGE:${file.name}`);
                        }
                    }

                    // Upload images ภายใน transaction context
                    const currentMaxSort = await tx.eventPhoto.aggregate({
                        where: { event_id: body.event_id },
                        _max: { sortOrder: true }
                    });
                    
                    const startSortOrder = (currentMaxSort._max.sortOrder || -1) + 1;
                    const eventSlug = body.slug || existing.slug;

                    for (let i = 0; i < imageFiles.length; i++) {
                        const file = imageFiles[i];
                        try {
                            const timestamp = Date.now();
                            const randomStr = Math.random().toString(36).substring(2, 8);
                            const customPublicId = `${eventSlug}-${i}-${timestamp}-${randomStr}`;
                            
                            const uploadResult = await uploadImage(file, {
                                folder: 'events',
                                tags: ['event', eventSlug],
                                uploadedBy: Number(userId),
                                publicId: customPublicId,
                            });
                            
                            uploadedImages.push({
                                cloudinaryImageId: uploadResult.cloudinaryImage.id,
                                isMain: mainImageIndex !== null && i === mainImageIndex,
                                sortOrder: startSortOrder + i,
                            });
                        } catch (uploadError) {
                            console.error(`Failed to upload image ${i}:`, uploadError);
                            throw new Error(`IMAGE_UPLOAD_FAILED:${i}`);
                        }
                    }
                }

                // 6. ลบรูปภาพที่ระบุ
                if (deletePhotoIds.length > 0) {
                    await tx.eventPhoto.deleteMany({
                        where: {
                            id: { in: deletePhotoIds },
                            event_id: body.event_id
                        }
                    });
                }

                // 7. ถ้ามีการกำหนดรูปหลักใหม่ ให้ clear รูปหลักเก่า
                if (uploadedImages.some(img => img.isMain)) {
                    await tx.eventPhoto.updateMany({
                        where: { event_id: body.event_id },
                        data: { isMain: false }
                    });
                }

                // 8. เพิ่มรูปภาพใหม่
                if (uploadedImages.length > 0) {
                    await tx.eventPhoto.createMany({
                        data: uploadedImages.map(img => ({
                            event_id: body.event_id!,
                            cloudinaryImage_id: img.cloudinaryImageId,
                            isMain: img.isMain,
                            sortOrder: img.sortOrder,
                        }))
                    });
                }

                // 9. อัพเดท check-in time slots
                if (body.checkInTimeSlots !== undefined) {
                    await tx.checkInTimeSlot.deleteMany({
                        where: { event_id: body.event_id }
                    });

                    if (body.checkInTimeSlots.length > 0) {
                        await tx.checkInTimeSlot.createMany({
                            data: body.checkInTimeSlots.map(slot => ({
                                event_id: body.event_id!,
                                slot_number: slot.slot_number,
                                startTime: thaiToUTC(slot.startTime),
                                endTime: thaiToUTC(slot.endTime),
                                subSkillCategory_id: slot.subSkillCategory_id ?? undefined,
                                earlyCheckInMinutes: slot.earlyCheckInMinutes ?? null,
                            }))
                        });
                    }
                }

                // 10. อัพเดท skill rewards
                if (body.skillRewards !== undefined) {
                    await tx.eventSkillReward.deleteMany({
                        where: { event_id: body.event_id }
                    });

                    if (Array.isArray(body.skillRewards) && body.skillRewards.length > 0) {
                        // Validate skill rewards
                        for (const reward of body.skillRewards) {
                            if (!reward.subSkillCategory_id || reward.baseExperience === undefined) {
                                throw new Error("INVALID_SKILL_REWARD");
                            }

                            const subSkill = await tx.subSkillCategory.findUnique({
                                where: { id: reward.subSkillCategory_id }
                            });

                            if (!subSkill || !subSkill.isActive) {
                                throw new Error(`INACTIVE_SUBSKILL:${reward.subSkillCategory_id}`);
                            }
                        }

                        await tx.eventSkillReward.createMany({
                            data: body.skillRewards.map((reward: { 
                                subSkillCategory_id: number; 
                                baseExperience: number; 
                                bonusExperience?: number; 
                                levelType?: string 
                            }) => ({
                                event_id: body.event_id!,
                                subSkillCategory_id: reward.subSkillCategory_id,
                                baseExperience: reward.baseExperience,
                                bonusExperience: reward.bonusExperience || 0,
                                levelType: (reward.levelType || "I") as "I" | "II" | "III" | "IV",
                            }))
                        });
                    }
                }

                // 11. สร้าง update data
                const updateData: Record<string, unknown> = {};
                
                if (body.title_TH) updateData.title_TH = body.title_TH;
                if (body.title_EN) updateData.title_EN = body.title_EN;
                if (body.description_TH) updateData.description_TH = body.description_TH;
                if (body.description_EN) updateData.description_EN = body.description_EN;
                if (body.slug) updateData.slug = body.slug;
                if (body.majorCategory_id !== undefined) updateData.majorCategory_id = body.majorCategory_id;
                if (body.allowedYearLevels) updateData.allowedYearLevels = body.allowedYearLevels;
                if (body.staffAllowedYears) updateData.staffAllowedYears = body.staffAllowedYears;
                
                if (body.maxParticipants !== undefined) updateData.maxParticipants = body.maxParticipants;
                if (body.maxStaffCount !== undefined) updateData.maxStaffCount = body.maxStaffCount;
                if (body.waitlistEnabled !== undefined) updateData.waitlistEnabled = body.waitlistEnabled;
                
                if (body.registrationStart) updateData.registrationStart = thaiToUTC(body.registrationStart);
                if (body.registrationEnd) updateData.registrationEnd = thaiToUTC(body.registrationEnd);
                if (body.activityStart) updateData.activityStart = thaiToUTC(body.activityStart);
                if (body.activityEnd) updateData.activityEnd = thaiToUTC(body.activityEnd);
                
                if (body.lateCheckInPenalty !== undefined) updateData.lateCheckInPenalty = body.lateCheckInPenalty;
                if (body.staffCheckInTime !== undefined) updateData.staffCheckInTime = body.staffCheckInTime;

                if (body.status) updateData.status = body.status;
                if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
                if (body.priority !== undefined) updateData.priority = body.priority;

                if (body.staffCommunicationLink !== undefined) updateData.staffCommunicationLink = body.staffCommunicationLink;
                
                if (body.location_TH) updateData.location_TH = body.location_TH;
                if (body.location_EN) updateData.location_EN = body.location_EN || body.location_TH;
                if (body.locationMapUrl !== undefined) updateData.locationMapUrl = body.locationMapUrl;
                if (body.isOnline !== undefined) updateData.isOnline = body.isOnline;
                if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink;
                
                if (body.requirements_TH !== undefined) updateData.requirements_TH = body.requirements_TH;
                if (body.requirements_EN !== undefined) updateData.requirements_EN = body.requirements_EN;
                if (body.materials_TH !== undefined) updateData.materials_TH = body.materials_TH;
                if (body.materials_EN !== undefined) updateData.materials_EN = body.materials_EN;

                if (body.walkinEnabled !== undefined) updateData.walkinEnabled = body.walkinEnabled;
                if (body.walkinCapacity !== undefined) updateData.walkinCapacity = body.walkinCapacity;
                if (body.isForCMUEngineering !== undefined) updateData.isForCMUEngineering = body.isForCMUEngineering;
                if (body.isForCMUEngineering_Staff !== undefined) updateData.isForCMUEngineering_Staff = body.isForCMUEngineering_Staff;

                // 12. อัพเดท event
                const updatedEvent = await tx.event.update({
                    where: { id: body.event_id },
                    data: updateData,
                    include: {
                        creator: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            }
                        },
                        photos: {
                            include: {
                                cloudinaryImage: true
                            },
                            orderBy: [
                                { isMain: 'desc' },
                                { sortOrder: 'asc' }
                            ]
                        },
                        skillRewards: {
                            include: {
                                subSkillCategory: {
                                    include: {
                                        mainSkillCategory: true
                                    }
                                }
                            }
                        },
                        checkInTimeSlots: {
                            orderBy: { slot_number: 'asc' }
                        }
                    }
                });

                return updatedEvent;
            }, {
                maxWait: 10000,
                timeout: 30000,
            });

            return addCorsHeaders(
                NextResponse.json(transformDatesToThai({
                    success: true,
                    message: "Event updated successfully",
                    data: updated,
                    photosDeleted: deletePhotoIds.length,
                    photosAdded: imageFiles.length
                })),
                req
            );

        } catch (error) {
            console.error("Update event error:", error);
            
            // Handle specific errors
            if (error instanceof Error) {
                const errorMsg = error.message;
                
                if (errorMsg === "EVENT_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Event not found" }, { status: 404 }),
                        req
                    );
                }
                
                if (errorMsg === "USER_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json({ error: "User not found" }, { status: 404 }),
                        req
                    );
                }
                
                if (errorMsg === "UNAUTHORIZED_UPDATE") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "You don't have permission to update this event. Only SUPREME or Major Admin can update events."
                        }, { status: 403 }),
                        req
                    );
                }
                
                if (errorMsg === "UNAUTHORIZED_MAJOR_CATEGORY") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "You don't have permission to assign this event to the selected major category."
                        }, { status: 403 }),
                        req
                    );
                }
                
                if (errorMsg === "SLUG_EXISTS") {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Slug already exists" }, { status: 409 }),
                        req
                    );
                }
                
                if (errorMsg.startsWith("PHOTO_LIMIT_EXCEEDED")) {
                    const [, current, adding] = errorMsg.split(":");
                    return addCorsHeaders(
                        NextResponse.json({
                            error: `Cannot add ${adding} photos. Maximum 4 photos allowed (current: ${current})`
                        }, { status: 400 }),
                        req
                    );
                }
                
                if (errorMsg.startsWith("INVALID_IMAGE")) {
                    const fileName = errorMsg.split(":")[1];
                    return addCorsHeaders(
                        NextResponse.json({
                            error: `File ${fileName} must be an image`
                        }, { status: 400 }),
                        req
                    );
                }
                
                if (errorMsg.startsWith("IMAGE_UPLOAD_FAILED")) {
                    const index = errorMsg.split(":")[1];
                    return addCorsHeaders(
                        NextResponse.json({
                            error: `Failed to upload image ${index}`
                        }, { status: 500 }),
                        req
                    );
                }
                
                if (errorMsg === "INVALID_SKILL_REWARD") {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Invalid skill reward data" }, { status: 400 }),
                        req
                    );
                }
                
                if (errorMsg.startsWith("INACTIVE_SUBSKILL")) {
                    const subSkillId = errorMsg.split(":")[1];
                    return addCorsHeaders(
                        NextResponse.json({
                            error: `SubSkillCategory ${subSkillId} not found or inactive`
                        }, { status: 400 }),
                        req
                    );
                }
                
                return addCorsHeaders(
                    NextResponse.json({ error: errorMsg }, { status: 500 }),
                    req
                );
            }
            
            return addCorsHeaders(
                NextResponse.json({ error: "Unknown error occurred" }, { status: 500 }),
                req
            );
        }
    });
}

export async function DELETE(req: NextRequest) {
    return withActivityAdminAuth(req, async (req: NextRequest) => {
        try {
            const userId = await getUserId(req);
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) {
                return addCorsHeaders(
                    NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 }),
                    req
                );
            }

            const eventId = parseInt(id);

            // ใช้ transaction สำหรับการลบ event
            const result = await prisma.$transaction(async (tx) => {
                // 1. Lock event row และตรวจสอบว่ามีอยู่จริง
                const existing = await tx.event.findUnique({
                    where: { id: eventId },
                    include: {
                        registrations: true,
                        skillRewards: true,
                    }
                });

                if (!existing) {
                    throw new Error("EVENT_NOT_FOUND");
                }

                // 2. ตรวจสอบว่ามี registration หรือไม่
                if (existing.registrations.length > 0) {
                    throw new Error(`HAS_REGISTRATIONS:${existing.registrations.length}`);
                }

                // 3. ตรวจสอบสิทธิ์
                const currentUser = await tx.user.findUnique({
                    where: { id: Number(userId) },
                    include: { role: true }
                });

                if (!currentUser) {
                    throw new Error("USER_NOT_FOUND");
                }

                const isSupreme = currentUser.role.name === "SUPREME";

                if (!isSupreme) {
                    if (existing.majorCategory_id) {
                        const isMajorAdmin = await tx.majorAdmin.findFirst({
                            where: {
                                user_id: Number(userId),
                                majorCategory_id: Number(existing.majorCategory_id),
                                isActive: true
                            }
                        });

                        if (!isMajorAdmin) {
                            throw new Error("UNAUTHORIZED_DELETE");
                        }
                    } else {
                        if (existing.created_by !== Number(userId)) {
                            throw new Error("UNAUTHORIZED_DELETE");
                        }
                    }
                }

                // 4. ดึงข้อมูลรูปภาพก่อนลบ
                const eventPhotos = await tx.eventPhoto.findMany({
                    where: { event_id: eventId },
                    include: {
                        cloudinaryImage: true
                    }
                });

                // 5. ลบ event (cascade จะลบ EventPhoto, CheckInTimeSlot, EventSkillReward อัตโนมัติ)
                await tx.event.delete({
                    where: { id: eventId }
                });

                // 6. ลบ CloudinaryImage records
                if (eventPhotos.length > 0) {
                    const cloudinaryImageIds = eventPhotos.map(p => p.cloudinaryImage_id);
                    
                    await tx.cloudinaryImage.deleteMany({
                        where: {
                            id: { in: cloudinaryImageIds }
                        }
                    });

                    // Optional: ลบจาก Cloudinary service (ถ้าต้องการ)
                    // for (const photo of eventPhotos) {
                    //     try {
                    //         await deleteImage(photo.cloudinaryImage.publicId);
                    //     } catch (error) {
                    //         console.error('Failed to delete from Cloudinary:', error);
                    //     }
                    // }
                }

                return {
                    id: eventId,
                    title_EN: existing.title_EN,
                    title_TH: existing.title_TH,
                    photosDeleted: eventPhotos.length
                };
            }, {
                maxWait: 5000,
                timeout: 20000,
            });

            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: "Event deleted successfully",
                    data: result
                }),
                req
            );

        } catch (error) {
            console.error("Delete event error:", error);
            
            // Handle specific errors
            if (error instanceof Error) {
                const errorMsg = error.message;
                
                if (errorMsg === "EVENT_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json({ error: "Event not found" }, { status: 404 }),
                        req
                    );
                }
                
                if (errorMsg === "USER_NOT_FOUND") {
                    return addCorsHeaders(
                        NextResponse.json({ error: "User not found" }, { status: 404 }),
                        req
                    );
                }
                
                if (errorMsg.startsWith("HAS_REGISTRATIONS")) {
                    const count = errorMsg.split(":")[1];
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "Cannot delete event with registrations",
                            details: {
                                registrationCount: parseInt(count),
                                message: "Please cancel or complete all registrations first, or change event status to CANCELLED"
                            }
                        }, { status: 400 }),
                        req
                    );
                }
                
                if (errorMsg === "UNAUTHORIZED_DELETE") {
                    return addCorsHeaders(
                        NextResponse.json({
                            error: "You don't have permission to delete this event. Only SUPREME or Major Admin can delete events."
                        }, { status: 403 }),
                        req
                    );
                }
                
                return addCorsHeaders(
                    NextResponse.json({ error: errorMsg }, { status: 500 }),
                    req
                );
            }
            
            return addCorsHeaders(
                NextResponse.json({ error: "Unknown error occurred" }, { status: 500 }),
                req
            );
        }
    });
}