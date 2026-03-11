import { useRouter } from 'next/navigation';
import { useSessionStore, SessionState } from '@/store/useSessionStore';
import { useLogSession } from '@/hooks/useLogSession';
import { useEffect, useState } from 'react';
import { Trophy, Home, Loader2 } from 'lucide-react';

export function SessionCompleteUI() {
    const router = useRouter();
    const dailyWords = useSessionStore((s: SessionState) => s.dailyWords);
    const logSession = useLogSession();

    const [saving, setSaving] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const wordsCompleted = dailyWords.map((w: { word: string }) => w.word);

        logSession.mutate({ completedWords: wordsCompleted }, {
            onSuccess: () => {
                setSaving(false);
                setSaved(true);
            },
            onError: (err) => {
                console.error("Failed to save streak", err);
                setSaving(false);
                // We show success anyway for the kid, don't break the UX for a DB failure
            }
        });
    }, []);

    return (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-gradient-to-br from-yellow-50 to-orange-100 rounded-3xl shadow-2xl border-4 border-yellow-200">
            <Trophy className="w-32 h-32 text-yellow-500 mb-6 drop-shadow-lg" />

            <h1 className="text-5xl font-black text-orange-600 mb-4 tracking-tight">Mission Accomplished!</h1>

            <p className="text-2xl text-orange-800 font-medium mb-10">
                You crushed {dailyWords.length} words today. Your brain is getting huge!
            </p>

            {saving && (
                <div className="flex items-center gap-3 text-orange-500 mb-6 font-bold">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Saving your streak...
                </div>
            )}

            {!saving && (
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-4 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white px-10 py-6 rounded-full text-3xl font-bold shadow-xl outline-none"
                >
                    <Home className="w-8 h-8" />
                    Back to Home
                </button>
            )}
        </div>
    );
}
