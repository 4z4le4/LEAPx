/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { subscribeToNotifications, onForegroundMessage } from '../firebase/config';

interface NotificationState {
    isSupported: boolean;
    isSubscribed: boolean;
    permission: NotificationPermission;
}

export function useNotification(userId?: number) {
    const [state, setState] = useState<NotificationState>({
        isSupported: 'Notification' in window && 'serviceWorker' in navigator,
        isSubscribed: false,
        permission: 'default',
    });

    useEffect(() => {
        if (!state.isSupported) {
        console.warn('Notifications not supported');
        return;
        }

        setState(prev => ({
        ...prev,
        permission: Notification.permission,
        }));

        if (Notification.permission === 'granted') {
        handleSubscribe();
        }

        // Listen for foreground messages
        const unsubscribe = onForegroundMessage((payload) => {
        console.log('Received foreground notification:', payload);
        // add ... custom
        });

        return () => {
        if (unsubscribe) unsubscribe();
        };
    }, [state.isSupported, userId]);

    const handleSubscribe = async () => {
        try {
        const success = await subscribeToNotifications(userId);
        setState(prev => ({
            ...prev,
            isSubscribed: success,
            permission: Notification.permission,
        }));
        return success;
        } catch (error) {
        console.error('Error subscribing:', error);
        return false;
        }
    };

    const requestPermission = async () => {
        if (!state.isSupported) {
        alert('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
        return false;
        }

        return handleSubscribe();
    };

    return {
        ...state,
        requestPermission,
    };
}

export function useNotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        if (
        'Notification' in window &&
        Notification.permission === 'default' &&
        !localStorage.getItem('notification-prompt-dismissed')
        ) {
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, 5000);

        return () => clearTimeout(timer);
        }
    }, []);

    const dismissPrompt = () => {
        setShowPrompt(false);
        localStorage.setItem('notification-prompt-dismissed', 'true');
    };

    return {
        showPrompt,
        dismissPrompt,
    };
}