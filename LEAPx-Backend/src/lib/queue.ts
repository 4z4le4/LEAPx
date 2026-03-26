import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const approvalQueue = new Queue('auto-approval', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // ลองใหม่ 3 ครั้งถ้าล้มเหลว
        backoff: {
        type: 'exponential',
        delay: 5000, // เริ่มที่ 5 วินาที
        },
        removeOnComplete: {
        count: 100, // เก็บ job ที่สำเร็จไว้ 100 อัน
        age: 24 * 3600, // หรือ 24 ชั่วโมง
        },
        removeOnFail: {
        count: 500, // เก็บ job ที่ล้มเหลวไว้ 500 อัน
        },
    },
});


console.log('BullMQ Queue and Scheduler initialized');
