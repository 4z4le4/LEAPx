import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import prisma from '@/lib/prisma';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const messaging = admin.messaging();

interface SendNotificationRequest {
    user_id?: number;
    user_ids?: number[];
    sendToAll?: boolean;
    title_TH: string;
    title_EN: string;
    message_TH: string;
    message_EN: string;
    type?: 'EVENT_REMINDER' | 'REGISTRATION_CONFIRMED' | 'LEVEL_UP' | 'EVALUATION_AVAILABLE' | 'SYSTEM_ANNOUNCEMENT';
    data?: Record<string, string>;
    icon?: string;
    saveToDatabase?: boolean;
}

interface SendResult {
    success: number;
    failure: number;
    total: number;
    invalidTokens: number;
    savedNotifications: number;
}

interface ErrorResponse {
    error: string;
}

export async function POST(
    req: NextRequest
): Promise<NextResponse<SendResult | ErrorResponse>> {
    try {
        const internalKey = req.headers.get('X-Internal-Key');
        if (internalKey !== process.env.INTERNAL_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body: SendNotificationRequest = await req.json();

        if (!body.title_TH || !body.title_EN || !body.message_TH || !body.message_EN) {
            return NextResponse.json(
                { error: 'Missing required fields: title_TH, title_EN, message_TH, message_EN' },
                { status: 400 }
            );
        }

        if (!body.sendToAll && !body.user_id && (!body.user_ids || body.user_ids.length === 0)) {
            return NextResponse.json(
                { error: 'Must provide user_id, user_ids, or sendToAll' },
                { status: 400 }
            );
        }

        let tokens: Array<{ id: number; token: string; user_id: number | null }> = [];

        if (body.sendToAll) {
            tokens = await prisma.userFCMToken.findMany({
                where: { isActive: true },
                select: {
                id: true,
                token: true,
                user_id: true,
                },
            });
        console.log(`Sending notification to ALL tokens (${tokens.length} tokens)...`);
        } else {
        const targetUserIds = body.user_id 
            ? [body.user_id] 
            : body.user_ids!;

        tokens = await prisma.userFCMToken.findMany({
            where: {
            user_id: { in: targetUserIds },
            isActive: true,
            },
            select: {
            id: true,
            token: true,
            user_id: true,
            },
        });
        console.log(`Sending notification to ${targetUserIds.length} user(s)...`);
        }

        console.log(`Found ${tokens.length} active tokens`);

        if (tokens.length === 0) {
            return NextResponse.json({
                success: 0,
                failure: 0,
                total: 0,
                invalidTokens: 0,
                savedNotifications: 0,
            });
        }

        const messages = tokens.map((t) => ({
            token: t.token,
            notification: {
                title: body.title_EN,
                body: body.message_EN,
            },
            data: {
                type: body.type || 'SYSTEM_ANNOUNCEMENT',
                title_TH: body.title_TH,
                title_EN: body.title_EN,
                message_TH: body.message_TH,
                message_EN: body.message_EN,
                ...(body.data || {}),
            },
            webpush: body.icon ? {
                notification: {
                icon: body.icon,
                },
            } : undefined,
        }));

        const response = await messaging.sendEach(messages);

        console.log(`Successfully sent: ${response.successCount}/${tokens.length}`);
        console.log(`Failed: ${response.failureCount}/${tokens.length}`);

        const invalidTokenIds: number[] = [];
        
        response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
            ) {
            invalidTokenIds.push(tokens[idx].id);
            }
        }
        });

        if (invalidTokenIds.length > 0) {
            await prisma.userFCMToken.updateMany({
                where: { id: { in: invalidTokenIds } },
                data: { isActive: false },
            });
            console.log(`Deactivated ${invalidTokenIds.length} invalid tokens`);
        }

        // let savedCount = 0;
        const savedCount = 0;

        // if (body.saveToDatabase !== false) {
        // const uniqueUserIds = [...new Set(tokens.map(t => t.user_id).filter((id): id is number => id !== null))];
        
        // if (uniqueUserIds.length > 0) {
        //     const notifications = uniqueUserIds.map((userId) => ({
        //     user_id: userId,
        //     type: body.type || 'SYSTEM_ANNOUNCEMENT',
        //     title_TH: body.title_TH,
        //     title_EN: body.title_EN,
        //     message_TH: body.message_TH,
        //     message_EN: body.message_EN,
        //     data: body.data || {},
        //     isRead: false,
        //     }));

        //     const created = await prisma.notification.createMany({
        //     data: notifications,
        //     });
        //     savedCount = created.count;
        //     console.log(`Saved ${savedCount} notifications to database`);
        //     }
        // }

            return NextResponse.json({
            success: response.successCount,
            failure: response.failureCount,
            total: tokens.length,
            invalidTokens: invalidTokenIds.length,
            savedNotifications: savedCount
        });

    } catch (error) {
            console.error('Error sending notification:', error);
            return NextResponse.json(
            { error: 'Failed to send notification' },
            { status: 500 }
        );
    }
}