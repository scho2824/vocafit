import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ContextualExample {
    id: string;
    word_id: string;
    example_sentence: string;
    korean_translation: string;
}

export interface VocabularyContent {
    id: string;
    target_word: string;
    english_definition: string;
    korean_definition: string;
    part_of_speech: string;
    difficulty_level: string;
    contextual_examples: ContextualExample[];
}

export function useVocabularyContent(wordId: string | null) {
    return useQuery({
        queryKey: ['vocabularyContent', wordId],
        queryFn: async (): Promise<VocabularyContent> => {
            if (!wordId) throw new Error("wordId is required");

            const { data, error } = await supabase
                .from('vocabulary')
                .select(`
                    id,
                    target_word,
                    english_definition,
                    korean_definition,
                    part_of_speech,
                    difficulty_level,
                    contextual_examples (
                        id,
                        word_id,
                        example_sentence,
                        korean_translation
                    )
                `)
                .eq('id', wordId)
                .single();

            if (error) {
                console.error("Error fetching vocabulary content:", error);
                throw new Error('Failed to load vocabulary definition');
            }

            return data as VocabularyContent;
        },
        enabled: !!wordId,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours caching for static definitions
    });
}
