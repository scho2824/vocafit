'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSessionStore, SessionState } from '@/store/useSessionStore';
import { useVocabularyContent } from '@/hooks/useVocabularyContent';
import { useVariations } from '@/hooks/useVariations';
import { Volume2, Loader2, ArrowRight } from 'lucide-react';

interface SmartVocabUIProps {
    wordId: string;
}

export function SmartVocabUI({ wordId }: SmartVocabUIProps) {
    const setPhase = useSessionStore((s: SessionState) => s.setPhase);

    // Fetch static definition & baseline example
    const {
        data: vocabData,
        isLoading: isVocabLoading,
        isError: isVocabError
    } = useVocabularyContent(wordId);

    // AI Variations hook
    const {
        generateVariations,
        variations,
        isLoading: isAiLoading,
        abort
    } = useVariations();

    const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Trigger AI generation once the target word is known
    useEffect(() => {
        if (vocabData?.target_word) {
            generateVariations(vocabData.target_word);
        }
    }, [vocabData?.target_word, generateVariations]);

    // Cleanup TTS and SSE on unmount
    useEffect(() => {
        return () => {
            abort(); // Safe to call, cancels active requests
            if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
            window.speechSynthesis.cancel();
        };
    }, [abort]);

    // TTS Helper bound strictly to onClick events (Mobile Policy Compliance)
    const playAudio = useCallback((text: string) => {
        window.speechSynthesis.cancel(); // Prevent overlaps
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for kids

        // Brief timeout mitigates Chrome specific TTS race conditions
        ttsTimeoutRef.current = setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    }, []);

    if (isVocabLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[400px] w-full">
                <Loader2 size={48} className="animate-spin text-green-500 mb-4" />
                <p className="text-gray-500 text-lg">Loading dictionary...</p>
            </div>
        );
    }

    if (isVocabError || !vocabData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 rounded-3xl border-2 border-red-200 w-full">
                <p className="text-red-500 font-bold text-xl mb-4">Oops! Could not find this word.</p>
                <button
                    onClick={() => setPhase('completed')}
                    className="bg-red-500 text-white px-6 py-3 rounded-xl shadow hover:bg-red-600 transition-colors"
                >
                    Skip Word
                </button>
            </div>
        );
    }

    const baselineExample = vocabData.contextual_examples?.[0];

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-500">

            {/* Top Section: Word Identity */}
            <section className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border-2 border-green-100 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-green-300 to-green-500" />

                <h2 className="text-5xl md:text-7xl font-extrabold text-gray-800 tracking-tight mb-2 capitalize">
                    {vocabData.target_word}
                </h2>
                <div className="flex items-center gap-3 mb-6">
                    <span className="bg-green-100 text-green-700 font-medium px-3 py-1 rounded-full text-sm">
                        {vocabData.part_of_speech}
                    </span>
                    <button
                        onClick={() => playAudio(vocabData.target_word)}
                        className="p-3 bg-gray-100 hover:bg-green-100 text-green-600 rounded-full transition-colors active:scale-95"
                        aria-label="Listen to pronunciation"
                    >
                        <Volume2 size={24} />
                    </button>
                </div>

                <p className="text-2xl md:text-3xl font-medium text-gray-700">
                    {vocabData.korean_definition}
                </p>
                <p className="text-gray-500 mt-2 text-lg">
                    {vocabData.english_definition}
                </p>
            </section>

            {/* Middle Section: Baseline Example */}
            {baselineExample && (
                <section className="bg-blue-50 p-6 md:p-8 rounded-3xl border-2 border-blue-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                        onClick={() => playAudio(baselineExample.example_sentence)}
                        className="flex-shrink-0 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-md active:scale-95"
                    >
                        <Volume2 size={28} />
                    </button>
                    <div className="flex-1">
                        <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-1 leading-snug">
                            &quot;{baselineExample.example_sentence}&quot;
                        </p>
                        <p className="text-lg text-blue-800/80 font-medium">
                            {baselineExample.korean_translation}
                        </p>
                    </div>
                </section>
            )}

            {/* Bottom Section: Dynamic AI Variations */}
            <section className="bg-purple-50 p-6 md:p-8 rounded-3xl border-2 border-purple-100 flex flex-col gap-4 relative min-h-[150px]">
                <h3 className="text-lg font-bold text-purple-600 uppercase tracking-wide flex items-center gap-2 mb-2">
                    ✨ AI Context Explorer
                    {isAiLoading && <Loader2 size={18} className="animate-spin text-purple-400" />}
                </h3>

                {variations.length === 0 && isAiLoading && (
                    <div className="animate-pulse flex flex-col gap-4">
                        <div className="h-20 bg-purple-200/50 rounded-2xl w-full"></div>
                        <div className="h-20 bg-purple-200/50 rounded-2xl w-full opacity-70"></div>
                        <div className="h-20 bg-purple-200/50 rounded-2xl w-full opacity-40"></div>
                    </div>
                )}

                {variations.map((v, index) => (
                    <div
                        key={index}
                        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-purple-100 animate-in slide-in-from-bottom-2 duration-300"
                    >
                        <button
                            onClick={() => playAudio(v.sentence)}
                            className="flex-shrink-0 p-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors active:scale-95"
                        >
                            <Volume2 size={24} />
                        </button>
                        <div>
                            <p className="text-lg md:text-xl font-medium text-gray-800 mb-1">
                                {v.sentence}
                            </p>
                            <p className="text-purple-800/70">
                                {v.translation}
                            </p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Big Next Button to transition phase */}
            <div className="w-full pt-4 pb-12 flex justify-center">
                <button
                    onClick={() => setPhase('sentence_builder')}
                    className="group bg-gray-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-2xl md:text-3xl px-12 py-6 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all outline-none focus:ring-4 focus:ring-slate-400 flex items-center gap-4"
                >
                    I Got It! Let's Practice
                    <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
                </button>
            </div>

        </div>
    );
}
