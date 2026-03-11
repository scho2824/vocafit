import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationPrompt() {
    const { permissionStatus, initPushNotifications, isRegistering } = useNotifications();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if we haven't asked yet (default), and we aren't currently waiting for permission.
        if (permissionStatus === 'default') {
            const timer = setTimeout(() => setIsVisible(true), 1500); // Slight delay so it doesn't pop instantly
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [permissionStatus]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl mx-auto mb-8 bg-blue-500 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg shadow-blue-200"
            >
                <div className="flex items-center gap-4 text-white">
                    <div className="bg-white/20 p-3 rounded-full">
                        <Bell className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold">Don't miss your mission!</h3>
                        <p className="text-blue-100 font-medium mt-1">
                            Turn on daily reminders to build your vocabulary habit.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-blue-100 font-bold transition-all"
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={initPushNotifications}
                        disabled={isRegistering}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-blue-50 active:scale-95 text-blue-600 font-bold shadow-md transition-all disabled:opacity-80"
                    >
                        {isRegistering ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Enable'
                        )}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
