'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore, SessionState } from '@/store/useSessionStore';
import { TrainingSessionUI } from '@/components/features/training/TrainingSessionUI';

export default function TrainingPage() {
    const router = useRouter();
    const dailyWords = useSessionStore((s: SessionState) => s.dailyWords);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Hydration & State Loss Protection
    useEffect(() => {
        if (mounted && dailyWords.length === 0) {
            // A hard refresh wiped the Zustand store. Route the child safely back to the start.
            router.replace('/');
        }
    }, [mounted, dailyWords.length, router]);

    // Prevent hydration errors by not rendering until mounted
    // Also wait until we verified the state isn't missing
    if (!mounted || dailyWords.length === 0) {
        return <div className="min-h-screen bg-blue-50" />;
    }

    return (
        <main className="min-h-screen bg-blue-50 overflow-hidden relative">
            <TrainingSessionUI />
        </main>
    );
}
