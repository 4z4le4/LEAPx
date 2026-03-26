/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import { notifyNewEvent, notifyEventReminder, broadcastNotification } from '@/lib/notification';

interface NotificationJobData {
    type: 'NEW_EVENT' | 'EVENT_REMINDER' | 'BROADCAST';
    eventId?: number;
    broadcastData?: {
        title_TH: string;
        title_EN: string;
        message_TH: string;
        message_EN: string;
        type: string;
        data?: Record<string, string>;
    };
}

export const notificationWorker = new Worker<NotificationJobData>(
    'notifications',
    async (job: Job<NotificationJobData>) => {
        console.log(`📬 Processing notification job ${job.id} - Type: ${job.data.type}`);

        try {
        switch (job.data.type) {
            case 'NEW_EVENT':
            if (!job.data.eventId) throw new Error('eventId is required');
            await notifyNewEvent(job.data.eventId);
            break;

            case 'EVENT_REMINDER':
            if (!job.data.eventId) throw new Error('eventId is required');
            await notifyEventReminder(job.data.eventId);
            break;

            case 'BROADCAST':
            if (!job.data.broadcastData) throw new Error('broadcastData is required');
            await broadcastNotification(job.data.broadcastData as any);
            break;

            default:
            throw new Error(`Unknown notification type: ${job.data.type}`);
        }

        console.log(`Notification job ${job.id} completed`);
        return { success: true };
        } catch (error) {
        console.error(`Notification job ${job.id} failed: `, error);
        throw error; 
        }
    },
    {
        connection: redisConnection,
        concurrency: 2, // ส่งพร้อมกัน 2 jobs
        limiter: {
        max: 10, // ส่งได้สูงสุด 10 jobs
        duration: 60000, // ต่อ 1 นาที
        },
    }
);

notificationWorker.on('completed', (job) => {
    console.log(`Notification job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message);
});

console.log('Notification Worker started');