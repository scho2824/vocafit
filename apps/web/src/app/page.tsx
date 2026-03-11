'use client';

import { useRouter } from 'next/navigation';
import { useDailyMission } from '@/hooks/useDailyMission';
import { useSessionStore, SessionState } from '@/store/useSessionStore';
import { NotificationPrompt } from '@/components/layout/NotificationPrompt';
import { motion } from 'framer-motion';
import { Play, Sparkles, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { data: dailyMission, isLoading, error } = useDailyMission();
  const startSession = useSessionStore((s: SessionState) => s.startSession);

  const handleStartMission = () => {
    if (!dailyMission || dailyMission.length === 0) return;

    // Populate the Zustand store with today's 3 words
    startSession(dailyMission);

    // Push the child into the locked-down training Orchestrator
    router.push('/training');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-8 text-center text-red-500">
        <h1 className="text-3xl font-bold mb-4">Oh no! We couldn't load your mission.</h1>
        <p className="text-xl">Please check your internet connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-6 overflow-hidden relative">
      <NotificationPrompt />

      {/* Playful Background Elements */}
      <div className="absolute top-10 w-full flex justify-between px-20 opacity-20 pointer-events-none">
        <Sparkles className="w-24 h-24 text-blue-400 rotate-12" />
        <Sparkles className="w-16 h-16 text-yellow-400 -rotate-12" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 bg-white p-10 sm:p-16 rounded-[3rem] shadow-xl border-8 border-white/50 flex flex-col items-center max-w-2xl w-full text-center"
      >
        <div className="bg-orange-100 text-orange-600 px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm mb-6">
          Daily Challenge
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-slate-800 mb-6 drop-shadow-sm leading-tight">
          Ready to grow your brain?
        </h1>

        <p className="text-2xl text-slate-500 font-medium mb-12">
          {isLoading
            ? 'Finding the perfect words for you today...'
            : (!dailyMission || dailyMission.length === 0)
              ? "You've learned every word! Check back tomorrow."
              : `Your mission is ready! Let's learn ${dailyMission.length} new words together.`}
        </p>

        <button
          onClick={handleStartMission}
          disabled={isLoading || !dailyMission || dailyMission.length === 0}
          className="group relative flex items-center justify-center w-full sm:w-auto gap-4 bg-blue-500 hover:bg-blue-600 active:scale-95 disabled:bg-gray-300 disabled:scale-100 text-white font-black text-3xl sm:text-4xl px-12 py-8 rounded-[2rem] shadow-lg transition-all focus:ring-8 focus:ring-blue-200 outline-none"
        >
          {isLoading ? (
            <Loader2 className="w-12 h-12 animate-spin" />
          ) : (
            <>
              START MISSION
              <Play className="w-10 h-10 fill-white group-hover:translate-x-2 transition-transform" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
