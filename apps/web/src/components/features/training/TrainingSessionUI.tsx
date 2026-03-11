'use client';

import { useSessionStore, SessionState } from '@/store/useSessionStore';
import { SmartVocabUI } from './SmartVocabUI';
import { SentenceBuilderUI } from './SentenceBuilderUI';
import { SessionCompleteUI } from './SessionCompleteUI';
import { AnimatePresence, motion } from 'framer-motion';

export function TrainingSessionUI() {
    const dailyWords = useSessionStore((s: SessionState) => s.dailyWords);
    const currentIndex = useSessionStore((s: SessionState) => s.currentIndex);
    const currentPhase = useSessionStore((s: SessionState) => s.currentPhase);

    // Safety check: if words aren't loaded, return empty (the router will redirect)
    if (!dailyWords || dailyWords.length === 0 || currentIndex >= dailyWords.length) {
        // Only an exception if the phase equals completed AND we actually finished the array.
        if (currentPhase !== 'completed') {
            return null;
        }
    }

    const currentWord = dailyWords[currentIndex];

    return (
        // min-h-[80vh] prevents aggressive layout collapse when swapping components
        <div className="relative w-full max-w-4xl mx-auto min-h-[85vh] flex items-center justify-center py-10 px-4">

            {/* Array Progress Tracker for the Kids */}
            {currentPhase !== 'completed' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                    {dailyWords.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-3 w-12 rounded-full transition-all duration-500 ${idx < currentIndex ? 'bg-green-500' :
                                idx === currentIndex ? 'bg-blue-500 scale-110' :
                                    'bg-gray-300'
                                }`}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence mode="wait">
                {(currentPhase === 'smart_vocabulary') && (
                    <motion.div
                        key={`vocab-${currentIndex}`} // Unique key forces Framer Motion to animate between words
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        <SmartVocabUI wordId={currentWord.id} />
                    </motion.div>
                )}

                {currentPhase === 'sentence_builder' && (
                    <motion.div
                        key={`sentence-${currentIndex}`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        <SentenceBuilderUI targetWord={currentWord.word} />
                    </motion.div>
                )}

                {currentPhase === 'completed' && (
                    <motion.div
                        key="completed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className="w-full"
                    >
                        <SessionCompleteUI />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
