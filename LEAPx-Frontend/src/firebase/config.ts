import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { backend_url } from '../../utils/constants';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: ReturnType<typeof getMessaging> | null = null;

try {
        if ('serviceWorker' in navigator) {
            messaging = getMessaging(app);
            console.log('Firebase Messaging initialized');
        }
    } catch (error) {
        console.error('Firebase Messaging not supported:', error);
    }

export async function requestNotificationPermission() {
    try {
        if (!messaging) {
        throw new Error('Messaging not initialized');
        }

        // ขอ permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
        console.log('Notification permission granted');
        
        // ลงทะเบียน service worker
        const registration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
        );
        
        // รับ FCM token
        const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (currentToken) {
            console.log('FCM Token received:', currentToken.substring(0, 20) + '...');
            return currentToken;
        } else {
            console.log('No registration token available');
            return null;
        }
        } else {
        console.log('Notification permission denied');
        return null;
        }
    } catch (error) {
        console.error('Error getting notification permission:', error);
        return null;
    }
}

export async function subscribeToNotifications(userId?: number) {
    try {
        const token = await requestNotificationPermission();
        
        if (!token) {
        console.log('No token to subscribe');
        return false;
        }

        // ส่ง token ไปยัง backend
        const response = await fetch(`${backend_url}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            userId: userId || null,
            deviceInfo: navigator.userAgent,
        }),
        });

        if (response.ok) {
        console.log('Subscribed to notifications');
        return true;
        } else {
        console.error('Failed to subscribe:', await response.text());
        return false;
        }
    } catch (error) {
        console.error('Error subscribing to notifications:', error);
        return false;
    }
}

// notification foreground
export function onForegroundMessage(callback: (payload: unknown) => void) {
    if (!messaging) {
        console.warn('Messaging not initialized');
        return () => {};
    }

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
        
        // แสดง notification เอง (เพราะ browser ไม่แสดงอัตโนมัติเมื่อแอปเปิดอยู่)
        if (payload.notification) {
        new Notification(payload.notification.title || 'LEAP Notification', {
            body: payload.notification.body,
            icon: payload.notification.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'leap-notification',
        });
        }
    });
}

export { messaging };