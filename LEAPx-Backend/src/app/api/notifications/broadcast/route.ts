import { NextRequest, NextResponse } from 'next/server';
import { broadcastNotification } from '@/lib/notification';

export async function POST(req: NextRequest) {
    try {
        const internalKey = req.headers.get('X-Internal-Key');
        if (internalKey !== process.env.INTERNAL_API_KEY) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
        }

        const body = await req.json();
        
        // Validate required fields
        if (!body.title_TH || !body.title_EN || !body.message_TH || !body.message_EN) {
        return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
        );
        }

        // ส่ง broadcast notification
        const result = await broadcastNotification({
        title_TH: body.title_TH,
        title_EN: body.title_EN,
        message_TH: body.message_TH,
        message_EN: body.message_EN,
        type: body.type || 'SYSTEM_ANNOUNCEMENT',
        data: body.data,
        icon: body.icon,
        targetUserIds: body.targetUserIds, // optional
        });

        return NextResponse.json({
        success: true,
        result: {
            sent: result.success,
            failed: result.failure,
            total: result.total,
        },
        });
    } catch {
        console.error('Error broadcasting notification:');
        return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
        );
    }
}