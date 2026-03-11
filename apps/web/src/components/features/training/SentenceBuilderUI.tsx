'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, CheckCircle, RefreshCcw } from 'lucide-react';
import { useEvaluateSentence } from '@/hooks/useEvaluateSentence';
import { useSentenceStore, SentenceState } from '@/store/useSentenceStore';
import { useSessionStore, SessionState } from '@/store/useSessionStore';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/payment/Paywall';

interface SentenceBuilderUIProps {
    targetWord: string;
}

export function SentenceBuilderUI({ targetWord }: SentenceBuilderUIProps) {
    const [localInput, setLocalInput] = useState('');
    const isEvaluating = useSentenceStore((s: SentenceState) => s.isEvaluating);
    const setIsEvaluating = useSentenceStore((s: SentenceState) => s.setIsEvaluating);
    const feedback = useSentenceStore((s: SentenceState) => s.feedback);
    const setFeedback = useSentenceStore((s: SentenceState) => s.setFeedback);
    const nextWord = useSessionStore((s: SessionState) => s.nextWord);
    const evaluationCount = useSessionStore((s: SessionState) => s.evaluationCount);
    const incrementEvaluation = useSessionStore((s: SessionState) => s.incrementEvaluation);

    const { data: subscription } = useSubscription();
    const [showPaywall, setShowPaywall] = useState(false);

    const evaluateSentence = useEvaluateSentence();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus on mount and cleanup
    useEffect(() => {
        inputRef.current?.focus();

        return () => {
            useSentenceStore.getState().resetSentence();
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localInput.trim() || isEvaluating) return;

        // Check subscription and limits
        const isFreeLimited = subscription?.status !== 'active' && evaluationCount >= 3;
        if (isFreeLimited) {
            setShowPaywall(true);
            return;
        }

        setErrorMsg(null);
        setIsEvaluating(true);
        setFeedback(null);

        try {
            const result = await evaluateSentence.mutateAsync({
                targetWord,
                submittedSentence: localInput,
            });
            setFeedback(result);
            incrementEvaluation();
        } catch (err: any) {
            setErrorMsg(err.message || 'Something went wrong. Let\'s try again!');
        } finally {
            setIsEvaluating(false);
        }
    };

    const handlePlayAudio = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }, 50);
        }
    };

    const handleTryAgain = () => {
        setFeedback(null);
        setLocalInput('');
        setErrorMsg(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    return (
        <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col items-center">
            <Paywall isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

            {/* Target Word Display */}
            <h1 className="text-5xl sm:text-6xl font-extrabold text-blue-600 mb-8 tracking-tight drop-shadow-sm text-center">
                {targetWord}
            </h1>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="w-full relative mb-12">
                <textarea
                    ref={inputRef}
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    disabled={isEvaluating}
                    placeholder={`Type a sentence using "${targetWord}"...`}
                    className="w-full min-h-[120px] p-6 text-2xl sm:text-3xl font-medium text-gray-800 bg-white border-4 border-blue-200 rounded-3xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none resize-none transition-all disabled:opacity-50"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setLocalInput('')}
                        disabled={isEvaluating || !localInput}
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors disabled:opacity-0"
                    >
                        <RefreshCcw size={20} />
                    </button>
                    <button
                        type="submit"
                        disabled={!localInput.trim() || isEvaluating}
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all outline-none focus:ring-4 focus:ring-blue-300"
                    >
                        {isEvaluating ? <Loader2 size={32} className="animate-spin" /> : <Send size={28} className="translate-x-1" />}
                    </button>
                </div>
            </form>

            {/* Error Message */}
            {errorMsg && (
                <p className="text-red-500 font-bold text-xl mb-8 bg-red-50 px-6 py-3 rounded-2xl">{errorMsg}</p>
            )}

            {/* AI Evaluation Loading State */}
            <AnimatePresence>
                {isEvaluating && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="flex flex-col items-center justify-center py-8 text-blue-500"
                    >
                        <Sparkles className="w-16 h-16 animate-pulse mb-4" />
                        <p className="text-3xl font-bold animate-pulse">AI is thinking...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Feedback State */}
            <AnimatePresence mode="popLayout">
                {feedback && !isEvaluating && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`w-full p-8 rounded-3xl border-4 shadow-lg ${feedback.success ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                            }`}
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    {feedback.success ? (
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    ) : (
                                        <RefreshCcw className="w-10 h-10 text-orange-500" />
                                    )}
                                    <h2 className={`text-3xl font-black ${feedback.success ? 'text-green-700' : 'text-orange-700'}`}>
                                        {feedback.success ? 'Great job!' : 'Almost there!'}
                                    </h2>
                                </div>

                                <p className="text-2xl text-gray-800 font-medium leading-relaxed mb-6">
                                    {feedback.message}
                                </p>

                                {feedback.suggestion && (
                                    <div className="bg-white/60 p-5 rounded-2xl">
                                        <p className="text-lg font-bold text-gray-500 mb-2 uppercase tracking-wide">Try saying it like this:</p>
                                        <p className="text-xl font-bold text-gray-800">{feedback.suggestion}</p>
                                    </div>
                                )}
                            </div>

                            {/* Huge Play Audio Button constraint */}
                            <button
                                onClick={() => handlePlayAudio(feedback.suggestion || feedback.message)}
                                aria-label="Play feedback audio"
                                className={`flex-shrink-0 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full active:scale-95 transition-all text-white shadow-md focus:ring-4 outline-none ${feedback.success ? 'bg-green-500 hover:bg-green-600 focus:ring-green-300' : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-300'
                                    }`}
                            >
                                <Sparkles size={40} className="animate-pulse" />
                            </button>
                        </div>

                        {feedback.success ? (
                            <div className="mt-10 flex justify-center">
                                <button
                                    onClick={() => {
                                        useSentenceStore.getState().resetSentence();
                                        nextWord();
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-2xl px-10 py-5 rounded-full shadow-lg transition-all focus:ring-4 focus:ring-blue-300 outline-none"
                                >
                                    Next Word
                                </button>
                            </div>
                        ) : (
                            <div className="mt-10 flex justify-center">
                                <button
                                    onClick={handleTryAgain}
                                    className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-2xl px-10 py-5 rounded-full shadow-lg transition-all focus:ring-4 focus:ring-orange-300 outline-none flex items-center gap-3"
                                >
                                    <RefreshCcw size={28} />
                                    Try Again!
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
