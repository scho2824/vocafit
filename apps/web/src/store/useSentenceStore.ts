import { create } from 'zustand';

export interface SentenceFeedback {
    success: boolean;
    message: string;
    suggestion?: string;
}

export interface SentenceState {
    sentenceInput: string;
    isEvaluating: boolean;
    feedback: SentenceFeedback | null;

    // Mutators
    setSentenceInput: (input: string) => void;
    setIsEvaluating: (isEvaluating: boolean) => void;
    setFeedback: (feedback: SentenceFeedback | null) => void;
    resetSentence: () => void;
}

export const useSentenceStore = create<SentenceState>((set) => ({
    sentenceInput: '',
    isEvaluating: false,
    feedback: null,

    setSentenceInput: (input) => set({ sentenceInput: input }),
    setIsEvaluating: (isEvaluating) => set({ isEvaluating }),
    setFeedback: (feedback) => set({ feedback }),
    resetSentence: () => set({
        sentenceInput: '',
        isEvaluating: false,
        feedback: null
    })
}));
