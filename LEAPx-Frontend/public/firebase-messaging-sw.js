importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

//! now not use this fuction
firebase.initializeApp({
    apiKey: "-",
    authDomain: "leapx-ef2b7.firebaseapp.com",
    projectId: "leapx-ef2b7",
    storageBucket: "leapx-ef2b7.firebasestorage.app",
    messagingSenderId: "566085849302",
    appId: "1:566085849302:web:96fdd8633d6ff0a95e3977",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'LEAP Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/icon-192x192.png',
        badge: './pwa-192x192.png',
        tag: 'leap-notification',
        data: payload.data,
        requireInteraction: false,
        vibrate: [200, 100, 200],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();

    // เปิดหน้าที่ต้องการเมื่อคลิก notification
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
            // ถ้ามี window เปิดอยู่แล้ว ให้ focus
            for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
                return client.focus();
            }
            }
            // ถ้าไม่มี ให้เปิด window ใหม่
            if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
            }
        })
    );
});