import { NextRequest, NextResponse } from 'next/server';
import { approvalQueue } from '@/lib/queue';

export async function POST(req: NextRequest) {
  try {
    // ตรวจสอบ internal key
    const internalKey = req.headers.get('X-Internal-Key');
    if (internalKey !== (process.env.INTERNAL_API_KEY || 'your-secret-key')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { reason, immediate } = body;

    // เพิ่ม job ไปยัง queue
    const job = await approvalQueue.add(
      'manual-approve-pending',
      {
        reason: reason || 'Manually triggered approval',
        triggeredBy: 'manual',
        timestamp: new Date().toISOString(),
      },
      {
        delay: immediate ? 0 : 5000, // ถ้าไม่ immediate ให้รอ 5 วินาที
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Job added to queue',
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error triggering approval:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint สำหรับดูสถานะ queue
export async function GET() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      approvalQueue.getWaitingCount(),
      approvalQueue.getActiveCount(),
      approvalQueue.getCompletedCount(),
      approvalQueue.getFailedCount(),
    ]);

    return NextResponse.json({
      success: true,
      queue: {
        waiting,
        active,
        completed,
        failed,
      },
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}