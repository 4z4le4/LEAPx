import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/lib/redis';

interface ApprovalJobData {
    reason: string;
    triggeredBy: 'cron' | 'manual';
    timestamp: string;
}

export const approvalWorker = new Worker<ApprovalJobData>(
    'auto-approval',
    async (job: Job<ApprovalJobData>) => {
        console.log(`Processing job ${job.id} at ${new Date().toISOString()}`);
        console.log('Job data:', job.data);

        try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const apiUrl = `${baseUrl}/api/daily/event/user`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': process.env.INTERNAL_API_KEY || 'your-secret-key',
            },
            body: JSON.stringify({
            action: 'approve_all_pending_system',
            reason: job.data.reason,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        console.log('Job completed successfully:', result);
        
        return {
            success: true,
            processedAt: new Date().toISOString(),
            result,
        };
        } catch (error) {
        console.error('Job failed:', error);
        throw error; // จะทำให้ job retry ตาม attempts ที่ตั้งไว้
        }
    },
    {
        connection: redisConnection,
        concurrency: 1, // ประมวลผลทีละ 1 job
        limiter: {
        max: 1, // จำกัดไม่เกิน 1 job
        duration: 60000, // ต่อ 60 วินาที
        },
    }
);

// Worker event handlers
approvalWorker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed with result:`, result);
});

approvalWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err.message);
});

approvalWorker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('Approval Worker started');