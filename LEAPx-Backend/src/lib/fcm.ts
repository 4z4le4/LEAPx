import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    admin.initializeApp({
        credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
        }),
    });
    
    console.log('Firebase Admin initialized');
}

export const messaging = admin.messaging();

// ฟังก์ชันส่ง notification แบบ broadcast
export async function sendBroadcastNotification(
    tokens: string[],
    notification: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        data?: Record<string, string>;
    }
    ) {
    if (tokens.length === 0) {
        return { success: 0, failure: 0 };
    }

    // FCM รองรับส่งพร้อมกันสูงสุด 500 tokens ต่อครั้ง
    const batchSize = 500;
    const batches: string[][] = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    for (const batch of batches) {
        try {
        const message: admin.messaging.MulticastMessage = {
            notification: {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.icon,
            },
            data: notification.data || {},
            tokens: batch,
            webpush: {
            notification: {
                icon: notification.icon || '/icon-192x192.png',
                badge: notification.badge || '/badge-72x72.png',
                requireInteraction: false,
                tag: 'leap-notification',
                renotify: true,
            },
            fcmOptions: {
                link: notification.data?.url || '/',
            },
            },
        };

        const response = await messaging.sendEachForMulticast(message);
        
        successCount += response.successCount;
        failureCount += response.failureCount;

        // เก็บ token ที่ล้มเหลว
        response.responses.forEach((resp, idx) => {
            if (!resp.success && batch[idx]) {
            invalidTokens.push(batch[idx]);
            }
        });

        console.log(`Batch sent: ${response.successCount}/${batch.length} success`);
        } catch (error) {
        console.error('Error sending batch:', error);
        failureCount += batch.length;
        }
    }

    return {
        success: successCount,
        failure: failureCount,
        invalidTokens,
        total: tokens.length,
    };
}

// ฟังก์ชันส่งให้ user เฉพาะคน
export async function sendToUser(
    userId: number,
    notification: {
        title: string;
        body: string;
        icon?: string;
        data?: Record<string, string>;
    }
    ) {
    const prisma = (await import('./prisma')).default;
    
    const tokens = await prisma.userFCMToken.findMany({
        where: {
        user_id: userId,
        isActive: true,
        },
        select: { token: true },
    });

    const tokenList = tokens.map(t => t.token);
    return sendBroadcastNotification(tokenList, notification);
}

export default messaging;