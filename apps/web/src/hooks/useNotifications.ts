import { useEffect, useState, useCallback } from 'react';
// @ts-ignore
import { initializeApp, getApps } from 'firebase/app';
// @ts-ignore
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { supabase } from '@/lib/supabase';

// Environment variables must be set in Vercel/Next.js
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function useNotifications() {
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'default'>('default');
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        // Only run on the client side
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const initPushNotifications = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        setIsRegistering(true);
        try {
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn("User must be logged in to register push notifications");
                return;
            }

            // Request permission explicitly driven by user action
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                // Initialize Firebase
                const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
                const messaging = getMessaging(app);

                // Register Service Worker
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                // Get FCM Token
                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration,
                });

                if (currentToken) {
                    // Caching strategy: Only hit DB if token is new
                    const cachedToken = localStorage.getItem('fcm_token');

                    if (cachedToken !== currentToken) {
                        const { error } = await supabase
                            .from('user_push_tokens')
                            .upsert(
                                {
                                    user_id: session.user.id,
                                    token: currentToken,
                                    platform: 'web',
                                },
                                { onConflict: 'token' }
                            );

                        if (error) {
                            console.error('Failed to save push token to Supabase', error);
                        } else {
                            localStorage.setItem('fcm_token', currentToken);
                        }
                    }

                    // Handle foreground messages
                    onMessage(messaging, (payload: MessagePayload) => {
                        console.log('Message received in foreground ', payload);
                        // Future UX: Trigger a local toast notification
                    });

                } else {
                    console.warn('No registration token available.');
                }
            }
        } catch (error) {
            console.error('Error initializing push notifications:', error);
        } finally {
            setIsRegistering(false);
        }
    }, []);

    // We no longer eagerly request permissions in useEffect. 
    // It must be triggered manually via initPushNotifications()

    return { permissionStatus, initPushNotifications, isRegistering };
}
