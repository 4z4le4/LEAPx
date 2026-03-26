import { approvalQueue } from './queue';
import { CronJob } from 'cron';

export function scheduleApprovalJobs() {
    const schedules = [
        { time: '0 8 * * *', name: '8:00 AM' },    // 8 โมงเช้า
        { time: '0 12 * * *', name: '12:00 PM' },  // เที่ยง
        { time: '0 16 * * *', name: '4:00 PM' },   // 4 โมงเย็น
        { time: '0 23 * * *', name: '11:00 PM' },   // 5 ทุ่ม 
    ];

    schedules.forEach((schedule) => {
        const job = new CronJob(
        schedule.time,
        async () => {
            console.log(`!!!Triggering auto-approval at ${schedule.name}`);
            
            try {
            const cleanName = schedule.name.replace(/[^a-zA-Z0-9]/g, '-');
            await approvalQueue.add(
                'auto-approve-pending',
                {
                reason: `Auto-approved by scheduled cron job at ${schedule.name}`,
                triggeredBy: 'cron',
                timestamp: new Date().toISOString(),
                },
                {
                jobId: `cron-${cleanName}-${Date.now()}`, // Unique job ID
                }
            );
            
            console.log(`Job added to queue for ${schedule.name}`);
            } catch (error) {
            console.error(`Failed to add job for ${schedule.name}:`, error);
            }
        },
        null,
        true,
        'Asia/Bangkok' 
        );

        job.start();
        console.log(`Scheduled job for ${schedule.name} (${schedule.time})`);
    });
}
