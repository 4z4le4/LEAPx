import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserId } from "@/middleware/auth";
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { transformDatesToThai } from '@/utils/timezone';

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(req: NextRequest) {
    const userId = getUserId(req);
    if (userId instanceof NextResponse) {
        return addCorsHeaders(userId, req);
    }

    try {
        const now = new Date();
        
        const currentEvent = await prisma.eventRegistration.findFirst({
            where: {
                user_id: userId,
                status: {
                    in: ['ATTENDED', 'LATE']
                },
                checkedIn: true,
                checkedOut: false,
                event: {
                    status: 'PUBLISHED',
                    activityStart: {
                        lte: now
                    },
                    activityEnd: {
                        gte: now
                    }
                }
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title_TH: true,
                        title_EN: true,
                        description_TH: true,
                        description_EN: true,
                        location_TH: true,
                        location_EN: true,
                        activityStart: true,
                        activityEnd: true,
                        isOnline: true,
                        meetingLink: true,
                        allowMultipleCheckIns: true,
                        status: true
                    }
                },
                checkInRecords: {
                    where: {
                        checkedIn: true
                    },
                    include: {
                        checkInTimeSlot: {
                            select: {
                                id: true,
                                slot_number: true,
                                startTime: true,
                                endTime: true
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

        if (!currentEvent) {
            return addCorsHeaders(
                NextResponse.json({
                    success: true,
                    message: 'No current event',
                    data: null
                }),
                req
            );
        }

        const responseData = {
            registrationId: currentEvent.id,
            eventId: currentEvent.event.id,
            eventTitle_TH: currentEvent.event.title_TH,
            eventTitle_EN: currentEvent.event.title_EN,
            description_TH: currentEvent.event.description_TH,
            description_EN: currentEvent.event.description_EN,
            location_TH: currentEvent.event.location_TH,
            location_EN: currentEvent.event.location_EN,
            isOnline: currentEvent.event.isOnline,
            meetingLink: currentEvent.event.meetingLink,
            activityStart: currentEvent.event.activityStart,
            activityEnd: currentEvent.event.activityEnd,
            registrationStatus: currentEvent.status,
            checkInTime: currentEvent.checkInTime,
            
            allowMultipleCheckIns: currentEvent.event.allowMultipleCheckIns,
            checkInSlots: currentEvent.checkInRecords.map(record => ({
                slotId: record.checkInTimeSlot.id,
                slotNumber: record.checkInTimeSlot.slot_number,
                checkInTime: record.checkInTime,
                startTime: record.checkInTimeSlot.startTime,
                endTime: record.checkInTimeSlot.endTime,
                checkedOut: record.checkedOut,
                checkOutTime: record.checkOutTime
            })),
            currentCheckInSlot: currentEvent.checkInRecords.length > 0 
                ? {
                    slotId: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkInTimeSlot.id,
                    slotNumber: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkInTimeSlot.slot_number,
                    checkInTime: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkInTime,
                    startTime: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkInTimeSlot.startTime,
                    endTime: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkInTimeSlot.endTime,
                    checkedOut: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkedOut,
                    checkOutTime: currentEvent.checkInRecords[currentEvent.checkInRecords.length - 1].checkOutTime
                }
                : null
        };

        return addCorsHeaders(
            NextResponse.json(transformDatesToThai({
                success: true,
                message: 'Currently attending event',
                data: responseData
            })),
            req
        );

    } catch (error) {
        console.error('Error fetching current event:', error);
        return addCorsHeaders(
            NextResponse.json({
                success: false,
                error: 'Failed to fetch current event',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 500 }),
            req
        );
    }
}