// import { sendBroadcastNotification, sendToUser } from './fcm';
import { sendBroadcastNotification } from './fcm';
import prisma from './prisma';

export interface BroadcastNotificationData {
    title_TH: string;
    title_EN: string;
    message_TH: string;
    message_EN: string;
    type: 'EVENT_REMINDER' | 'REGISTRATION_CONFIRMED' | 'LEVEL_UP' | 'EVALUATION_AVAILABLE' | 'SYSTEM_ANNOUNCEMENT';
    data?: Record<string, string>;
    icon?: string;
    targetUserIds?: number[]; // ถ้าไม่ระบุ = ส่งทุกคน
}

// ส่ง notification แบบ broadcast
export async function broadcastNotification(notificationData: BroadcastNotificationData) {
    try {
        // 1. ดึง tokens ทั้งหมด (หรือเฉพาะ user ที่ระบุ)
        const tokens = await prisma.userFCMToken.findMany({
        where: {
            isActive: true,
            ...(notificationData.targetUserIds && notificationData.targetUserIds.length > 0 
            ? { user_id: { in: notificationData.targetUserIds } }
            : {}
            ),
        },
        select: { 
            token: true,
            user_id: true,
        },
        });

        if (tokens.length === 0) {
        console.log('No active tokens found');
        return { success: 0, failure: 0, total: 0 };
        }

        console.log(`Broadcasting to ${tokens.length} devices...`);

        // 2. ส่ง FCM notification
        const result = await sendBroadcastNotification(
        tokens.map(t => t.token),
        {
            title: notificationData.title_EN, // หรือเลือกตาม locale
            body: notificationData.message_EN,
            icon: notificationData.icon || '/icon-192x192.png',
            data: {
            type: notificationData.type,
            ...notificationData.data,
            },
        }
        );

        // 3. ลบ invalid tokens
        const invalidTokens = result?.invalidTokens ?? [];
        if (invalidTokens.length > 0) {
        await prisma.userFCMToken.updateMany({
            where: {
            token: { in: invalidTokens },
            },
            data: {
            // isActive: false,
            },
        });
        console.log(`Deactivated ${invalidTokens.length} invalid tokens`);
        }

        // 4. บันทึกประวัติใน Notification table (optional)
        const userIds = tokens
        .filter(t => t.user_id !== null)
        .map(t => t.user_id as number);

        if (userIds.length > 0) {
        await prisma.notification.createMany({
            data: userIds.map(userId => ({
            user_id: userId,
            type: notificationData.type,
            title_TH: notificationData.title_TH,
            title_EN: notificationData.title_EN,
            message_TH: notificationData.message_TH,
            message_EN: notificationData.message_EN,
            data: notificationData.data || {},
            })),
            skipDuplicates: true,
        });
        }

        console.log(`Broadcast complete: ${result.success}/${result.total} sent`);
        
        return result;
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        throw error;
    }
}

// ส่งการแจ้งเตือนเมื่อมี Event ใหม่
export async function notifyNewEvent(eventId: number) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
        title_TH: true,
        title_EN: true,
        activityStart: true,
        slug: true,
        },
    });

    if (!event) return;

    await broadcastNotification({
        title_TH: '🎉 กิจกรรมใหม่',
        title_EN: '🎉 New Event',
        message_TH: `${event.title_TH} - เปิดรับสมัครแล้ว!`,
        message_EN: `${event.title_EN} - Registration is now open!`,
        type: 'EVENT_REMINDER',
        data: {
        eventId: eventId.toString(),
        url: `/events/${event.slug}`,
        },
    });
}

// ส่งการแจ้งเตือนเมื่อ Event ใกล้จะเริ่ม
export async function notifyEventReminder(eventId: number) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
        registrations: {
            where: {
            status: 'REGISTERED',
            },
            select: {
            user_id: true,
            },
        },
        },
    });

    if (!event) return;

    const userIds = event.registrations.map(r => r.user_id);

    if (userIds.length === 0) return;

    await broadcastNotification({
        title_TH: 'เตือนกิจกรรม',
        title_EN: 'Event Reminder',
        message_TH: `${event.title_TH} จะเริ่มในอีก 1 ชั่วโมง!`,
        message_EN: `${event.title_EN} starts in 1 hour!`,
        type: 'EVENT_REMINDER',
        targetUserIds: userIds,
        data: {
        eventId: eventId.toString(),
        url: `/events/${event.slug}`,
        },
    });
}

// ส่งการแจ้งเตือนเมื่อขึ้นเลเวล
export async function notifyLevelUp(userId: number, skillName: string, newLevel: number) {
    await broadcastNotification({
        title_TH: 'ขึ้นระดับแล้ว!',
        title_EN: 'Level Up!',
        message_TH: `คุณได้ขึ้นเป็น ${skillName} Level ${newLevel}`,
        message_EN: `You've reached ${skillName} Level ${newLevel}`,
        type: 'LEVEL_UP',
        targetUserIds: [userId],
        data: {
        skillName,
        level: newLevel.toString(),
        url: '/profile/skills',
        },
    });
}