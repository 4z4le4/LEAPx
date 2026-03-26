import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const notificationQueue = new Queue('notifications', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
        type: 'exponential',
        delay: 5000,
        },
        removeOnComplete: {
        count: 100,
        age: 24 * 3600, // 1 day
        },
        removeOnFail: {
        count: 500,
        },
    },
});

// Helper function: เพิ่ม job ส่งการแจ้งเตือน
export async function scheduleNotification(data: {
    type: 'NEW_EVENT' | 'EVENT_REMINDER' | 'BROADCAST';
    eventId?: number;
    broadcastData?: unknown;
    delay?: number; // milliseconds
    }) {
    return notificationQueue.add('send-notification', data, {
        delay: data.delay || 0,
        jobId: `notification-${data.type}-${Date.now()}`,
    });
}

// Helper: ส่งการแจ้งเตือนเมื่อมี Event ใหม่
export async function scheduleNewEventNotification(eventId: number) {
    return scheduleNotification({
        type: 'NEW_EVENT',
        eventId,
    });
}

// Helper: ส่งการแจ้งเตือนก่อน Event 1 ชั่วโมง
export async function scheduleEventReminder(eventId: number, eventStartTime: Date) {
    const oneHourBefore = new Date(eventStartTime.getTime() - 60 * 60 * 1000);
    const delay = Math.max(0, oneHourBefore.getTime() - Date.now());

    return scheduleNotification({
        type: 'EVENT_REMINDER',
        eventId,
        delay,
    });
}

console.log('Notification Queue initialized');