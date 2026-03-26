# Cron & Background Jobs API

API สำหรับการจัดการ background jobs และ scheduled tasks

## Table of Contents

- [POST /api/cron/trigger-approval](#post-apicrontrigger-approval) - Trigger approval job manually
- [GET /api/cron/trigger-approval](#get-apicrontrigger-approval) - ดูสถานะ queue

---

## POST /api/cron/trigger-approval

Trigger approval job manually (สำหรับทดสอบหรือ trigger ด้วยตนเอง)

### Endpoint
```
POST /api/cron/trigger-approval
```

### Authentication
Required - X-Internal-Key header (Internal API only)

### Request Headers

```
X-Internal-Key: your-internal-api-key
```

### Request Body

```json
{
  "reason": "Manually triggered for testing",
  "immediate": true
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | เหตุผลที่ trigger (default: "Manually triggered approval") |
| immediate | boolean | No | รันทันทีหรือไม่ (default: false, รอ 5 วินาที) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Job added to queue",
  "jobId": "12345"
}
```

| Field | Description |
|-------|-------------|
| success | สถานะความสำเร็จ |
| message | ข้อความตอบกลับ |
| jobId | Queue Job ID สำหรับติดตาม |

#### Error Responses

**401 Unauthorized** - ไม่มี X-Internal-Key หรือไม่ถูกต้อง
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Job Creation**:
   - สร้าง job ใน approval queue
   - Job type: `manual-approve-pending`
   - Payload: reason, triggeredBy, timestamp

2. **Execution Delay**:
   - `immediate: true` → รันทันที (delay: 0ms)
   - `immediate: false` → รอ 5 วินาที (delay: 5000ms)

3. **Job Processing**:
   - Worker จะดึง job จาก queue
   - เรียก API `/api/daily/event/user` ด้วย action `approve_all_pending_system`
   - อนุมัติ registrations ที่ pending ทั้งหมดในระบบ

4. **Queue System**:
   - ใช้ BullMQ หรือเทียบเท่า
   - Support retry on failure
   - Job tracking และ monitoring

### Use Cases

1. **Manual Testing**:
   - ทดสอบ approval process
   - Verify queue system

2. **Emergency Approval**:
   - อนุมัติทันทีเมื่อจำเป็น
   - Bypass normal schedule

3. **Scheduled Maintenance**:
   - Clear pending queue before maintenance
   - Force approval before event

### Example Usage

#### Trigger Immediate Approval

```bash
curl -X POST https://api.example.com/api/cron/trigger-approval \
  -H "X-Internal-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Emergency approval before event",
    "immediate": true
  }'
```

#### Trigger Delayed Approval (5 seconds)

```bash
curl -X POST https://api.example.com/api/cron/trigger-approval \
  -H "X-Internal-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Scheduled manual approval",
    "immediate": false
  }'
```

#### Node.js/JavaScript

```javascript
async function triggerApproval(reason, immediate = false) {
  const response = await fetch('/api/cron/trigger-approval', {
    method: 'POST',
    headers: {
      'X-Internal-Key': process.env.INTERNAL_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason, immediate })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Job added to queue:', data.jobId);
    return data.jobId;
  } else {
    throw new Error('Failed to trigger approval');
  }
}

// Usage
const jobId = await triggerApproval('Manual approval', true);
```

---

## GET /api/cron/trigger-approval

ดูสถานะ approval queue

### Endpoint
```
GET /api/cron/trigger-approval
```

### Authentication
ไม่ต้องการ (Public endpoint for monitoring)

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "queue": {
    "waiting": 3,
    "active": 1,
    "completed": 150,
    "failed": 5
  }
}
```

| Field | Description |
|-------|-------------|
| waiting | จำนวน jobs ที่รอดำเนินการ |
| active | จำนวน jobs ที่กำลังทำงาน |
| completed | จำนวน jobs ที่เสร็จสิ้น (total) |
| failed | จำนวน jobs ที่ล้มเหลว (total) |

#### Error Responses

**500 Internal Server Error**
```json
{
  "error": "Error getting queue status"
}
```

### Business Logic

1. **Queue Metrics**:
   - ดึงข้อมูลจาก BullMQ queue
   - แสดงสถานะ real-time

2. **Use Cases**:
   - Monitoring queue health
   - Debugging queue issues
   - Capacity planning

### Example Usage

#### cURL

```bash
curl https://api.example.com/api/cron/trigger-approval
```

#### JavaScript

```javascript
async function checkQueueStatus() {
  const response = await fetch('/api/cron/trigger-approval');
  const { queue } = await response.json();
  
  console.log('Queue Status:');
  console.log(`  Waiting: ${queue.waiting}`);
  console.log(`  Active: ${queue.active}`);
  console.log(`  Completed: ${queue.completed}`);
  console.log(`  Failed: ${queue.failed}`);
  
  return queue;
}

// Usage
const status = await checkQueueStatus();

// Alert if queue is backed up
if (status.waiting > 100) {
  console.warn('Queue is backed up!');
}

if (status.failed > 50) {
  console.error('High failure rate detected!');
}
```

#### Monitoring Dashboard Example

```javascript
import { useState, useEffect } from 'react';

function QueueMonitor() {
  const [queue, setQueue] = useState(null);
  
  useEffect(() => {
    const fetchStatus = async () => {
      const response = await fetch('/api/cron/trigger-approval');
      const { queue } = await response.json();
      setQueue(queue);
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (!queue) return <div>Loading...</div>;
  
  return (
    <div className="queue-monitor">
      <h2>Approval Queue Status</h2>
      <div className="metrics">
        <div className="metric">
          <span className="label">Waiting</span>
          <span className="value">{queue.waiting}</span>
        </div>
        <div className="metric">
          <span className="label">Active</span>
          <span className="value">{queue.active}</span>
        </div>
        <div className="metric">
          <span className="label">Completed</span>
          <span className="value">{queue.completed}</span>
        </div>
        <div className="metric">
          <span className="label">Failed</span>
          <span className={`value ${queue.failed > 10 ? 'error' : ''}`}>
            {queue.failed}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Queue System Architecture

### Overview

```
┌─────────────────┐
│   Scheduler     │  (Cron jobs)
│  - Daily 00:00  │
│  - Every hour   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Approval Job   │  (BullMQ)
│   - Queued      │
│   - Delayed     │
│   - Retry on    │
│     failure     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Worker         │  (Background process)
│  - Process job  │
│  - Call API     │
│  - Handle retry │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Approval API   │  (/api/daily/event/user)
│  - Approve all  │
│  - pending      │
│  - Send notif   │
└─────────────────┘
```

### Components

1. **Scheduler** (scheduleCronJobs.ts):
   - Cron expressions: `0 0 * * *` (daily at midnight)
   - Triggers: Time-based, event-based
   - Monitoring: Health checks

2. **Queue** (queue.ts, approvalQueue):
   - Redis-backed (BullMQ)
   - Job persistence
   - Automatic retries
   - Job prioritization

3. **Worker** (approvalWorker.ts):
   - Process jobs from queue
   - Error handling
   - Logging and monitoring
   - Graceful shutdown

4. **API** (/api/daily/event/user):
   - Process approvals
   - Update database
   - Send notifications

### Job Lifecycle

```
1. Job Created
   ↓
2. Queued (waiting)
   ↓
3. Picked by Worker (active)
   ↓
4. Processing
   ↓
5. Success → Completed
   OR
   Failed → Retry (max 3 times)
   ↓
6. Final: Completed or Failed
```

### Configuration

```javascript
// queue.ts
export const approvalQueue = new Queue('approval', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  }
});
```

---

## Scheduled Jobs

### Daily Approval Job

**Schedule**: Every day at 00:00 (midnight)

**Cron Expression**: `0 0 * * *`

**Purpose**: Auto-approve all pending registrations

**Process**:
1. Scheduler triggers at midnight
2. Add job to approval queue
3. Worker picks up job
4. Call `/api/daily/event/user` with `approve_all_pending_system`
5. Approve all pending registrations
6. Send notifications to users

### Hourly Reminder Job (Example)

**Schedule**: Every hour

**Cron Expression**: `0 * * * *`

**Purpose**: Send reminders for upcoming events

**Process**:
1. Scheduler triggers every hour
2. Find events starting in next 1-2 hours
3. Find registered users
4. Send reminder notifications

### Setup Cron Jobs

```javascript
// scheduleCronJobs.ts
import cron from 'node-cron';
import { approvalQueue } from './lib/queue';

export function scheduleCronJobs() {
  // Daily approval at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily approval job...');
    
    await approvalQueue.add('daily-approval', {
      reason: 'Scheduled daily approval',
      triggeredBy: 'cron',
      timestamp: new Date().toISOString(),
    });
  });
  
  // Hourly reminder
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly reminder job...');
    // Send reminders logic
  });
  
  console.log('Cron jobs scheduled');
}
```

---

## Monitoring & Debugging

### Health Check

```javascript
async function checkQueueHealth() {
  const response = await fetch('/api/cron/trigger-approval');
  const { queue } = await response.json();
  
  const health = {
    status: 'healthy',
    issues: []
  };
  
  // Check for backed up queue
  if (queue.waiting > 50) {
    health.status = 'warning';
    health.issues.push('Queue backed up');
  }
  
  // Check for high failure rate
  const failureRate = queue.failed / (queue.completed + queue.failed);
  if (failureRate > 0.1) { // 10% failure rate
    health.status = 'critical';
    health.issues.push('High failure rate');
  }
  
  // Check if worker is stuck
  if (queue.active > 0 && queue.waiting > 20) {
    health.status = 'warning';
    health.issues.push('Worker might be stuck');
  }
  
  return health;
}
```

### Logging

```javascript
// Worker with logging
worker.on('active', (job) => {
  console.log(`[Worker] Processing job ${job.id}...`);
});

worker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed:`, result);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[Worker] Error:', error);
});
```

### Debugging Failed Jobs

```bash
# View failed jobs in Redis
redis-cli LRANGE bull:approval:failed 0 -1

# Clear failed jobs
redis-cli DEL bull:approval:failed

# View job details
redis-cli GET bull:approval:job:12345
```

---

## Best Practices

### Job Design

1. **Idempotency**:
   - Jobs should be safe to run multiple times
   - Check if work already done before processing

2. **Error Handling**:
   - Catch and log all errors
   - Provide meaningful error messages
   - Use retry with exponential backoff

3. **Timeout**:
   - Set reasonable timeout for jobs
   - Prevent jobs from running forever

### Queue Management

1. **Monitoring**:
   - Monitor queue size regularly
   - Alert on anomalies
   - Track success/failure rates

2. **Cleanup**:
   - Remove old completed jobs
   - Archive failed jobs for analysis
   - Prevent queue overflow

3. **Scaling**:
   - Add more workers if queue backs up
   - Use job prioritization
   - Separate queues for different job types

### Security

1. **API Key Protection**:
   - Keep INTERNAL_API_KEY secure
   - Rotate keys regularly
   - Never expose in client-side code

2. **Access Control**:
   - Only internal services should trigger jobs
   - Validate all job parameters
   - Log all job triggers

3. **Rate Limiting**:
   - Limit manual trigger frequency
   - Prevent queue flooding
   - Implement cooldown periods

---

## Troubleshooting

### Queue Not Processing

1. **Check Worker**:
   ```bash
   # Check if worker is running
   ps aux | grep worker
   
   # Check worker logs
   tail -f logs/worker.log
   ```

2. **Check Redis**:
   ```bash
   # Check Redis connection
   redis-cli ping
   
   # Check queue keys
   redis-cli KEYS bull:approval:*
   ```

3. **Restart Worker**:
   ```bash
   # Stop worker
   pm2 stop worker
   
   # Clear queue (careful!)
   redis-cli FLUSHDB
   
   # Restart worker
   pm2 start worker
   ```

### High Failure Rate

1. **Check Logs**:
   - Review failed job logs
   - Identify common error patterns

2. **Verify API**:
   - Test approval API manually
   - Check database connections
   - Verify authentication

3. **Adjust Retry**:
   - Increase retry attempts
   - Adjust backoff strategy
   - Add delay between retries

### Jobs Stuck

1. **Check Active Jobs**:
   ```javascript
   const activeJobs = await approvalQueue.getActive();
   console.log('Active jobs:', activeJobs.length);
   ```

2. **Clean Stuck Jobs**:
   ```javascript
   // Remove jobs stuck for > 1 hour
   const stuckJobs = await approvalQueue.getActive();
   for (const job of stuckJobs) {
     const age = Date.now() - job.timestamp;
     if (age > 3600000) { // 1 hour
       await job.moveToFailed(new Error('Job stuck'), true);
     }
   }
   ```

3. **Restart Queue**:
   ```javascript
   await approvalQueue.obliterate({ force: true });
   ```

---

## Testing

### Unit Test

```javascript
import { approvalQueue } from './lib/queue';

describe('Approval Queue', () => {
  it('should add job to queue', async () => {
    const job = await approvalQueue.add('test-approval', {
      reason: 'Test',
      triggeredBy: 'test'
    });
    
    expect(job.id).toBeDefined();
    expect(job.data.reason).toBe('Test');
  });
  
  it('should process job', async () => {
    const job = await approvalQueue.add('test-approval', {
      reason: 'Test'
    });
    
    await job.waitUntilFinished();
    
    const state = await job.getState();
    expect(state).toBe('completed');
  });
});
```

### Integration Test

```javascript
describe('Trigger Approval API', () => {
  it('should trigger approval with valid key', async () => {
    const response = await fetch('/api/cron/trigger-approval', {
      method: 'POST',
      headers: {
        'X-Internal-Key': process.env.INTERNAL_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Test',
        immediate: true
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.jobId).toBeDefined();
  });
  
  it('should reject without valid key', async () => {
    const response = await fetch('/api/cron/trigger-approval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Test'
      })
    });
    
    expect(response.status).toBe(401);
  });
});
```

### Manual Testing

```bash
# 1. Trigger job
curl -X POST http://localhost:3000/api/cron/trigger-approval \
  -H "X-Internal-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test", "immediate": true}'

# 2. Check status
curl http://localhost:3000/api/cron/trigger-approval

# 3. Monitor logs
tail -f logs/worker.log

# 4. Check Redis
redis-cli
> KEYS bull:approval:*
> LRANGE bull:approval:completed 0 10
```
