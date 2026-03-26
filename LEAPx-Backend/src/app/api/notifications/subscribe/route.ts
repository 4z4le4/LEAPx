import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, userId, deviceInfo } = body;

        if (!token) {
        return NextResponse.json(
            { error: 'Token is required' },
            { status: 400 }
        );
        }

        // บันทึก/อัปเดต token
        const savedToken = await prisma.userFCMToken.upsert({
        where: { token },
        update: {
            user_id: userId || null,
            deviceInfo: deviceInfo || null,
            isActive: true,
            lastUsed: new Date(),
        },
        create: {
            token,
            user_id: userId || null,
            deviceInfo: deviceInfo || null,
            isActive: true,
        },
        });

        console.log('FCM token saved:', token.substring(0, 20) + '...');

        return NextResponse.json({
        success: true,
        tokenId: savedToken.id,
        });
    } catch {
        console.error('Error saving token:');
        return NextResponse.json(
        { error: 'Failed to save token' },
        { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
        return NextResponse.json(
            { error: 'Token is required' },
            { status: 400 }
        );
        }

        await prisma.userFCMToken.updateMany({
        where: { token },
        data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch {
        console.error('Error deleting token:');
        return NextResponse.json(
        { error: 'Failed to delete token' },
        { status: 500 }
        );
    }
}