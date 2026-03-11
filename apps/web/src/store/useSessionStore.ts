import { create } from 'zustand';

export type Phase = 'smart_vocabulary' | 'sentence_builder' | 'completed';

export interface ReviewWord {
    id: string;
    word: string;
}

export interface SessionState {
    dailyWords: ReviewWord[];
    currentIndex: number;
    currentPhase: Phase;
    evaluationCount: number;

    // Mutators
    startSession: (words: ReviewWord[]) => void;
    nextWord: () => void;
    setPhase: (phase: Phase) => void;
    incrementEvaluation: () => void;
    resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    dailyWords: [],
    currentIndex: 0,
    currentPhase: 'smart_vocabulary',
    evaluationCount: 0,

    startSession: (words) => set({
        dailyWords: words,
        currentIndex: 0,
        currentPhase: 'smart_vocabulary',
        evaluationCount: 0
    }),

    nextWord: () => set((state) => {
        const nextIndex = state.currentIndex + 1;
        if (nextIndex >= state.dailyWords.length) {
            return { currentPhase: 'completed', currentIndex: nextIndex };
        }
        return {
            currentIndex: nextIndex,
            currentPhase: 'smart_vocabulary'
        };
    }),

    setPhase: (phase) => set({ currentPhase: phase }),

    incrementEvaluation: () => set((state) => ({
        evaluationCount: state.evaluationCount + 1
    })),

    resetSession: () => set({
        dailyWords: [],
        currentIndex: 0,
        currentPhase: 'smart_vocabulary',
        evaluationCount: 0
    })
}));
