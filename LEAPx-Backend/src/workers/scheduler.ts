import 'dotenv/config';
import { scheduleApprovalJobs } from '../lib/scheduleCronJobs';

console.log('Scheduler process started');

scheduleApprovalJobs();

// Keep process alive
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});