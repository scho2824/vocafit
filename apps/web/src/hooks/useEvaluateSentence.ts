import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SentenceFeedback } from '@/store/useSentenceStore';

interface EvaluateSentencePayload {
    targetWord: string;
    submittedSentence: string;
}

export function useEvaluateSentence() {
    return useMutation({
        mutationFn: async ({ targetWord, submittedSentence }: EvaluateSentencePayload): Promise<SentenceFeedback> => {

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || '';

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}/functions/v1/evaluate-sentence`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ targetWord, submittedSentence })
                }
            );

            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error('Unauthorized: Please log in again.');
                }
                throw new Error('Failed to evaluate sentence');
            }

            const json = await res.json();
            return json as SentenceFeedback;
        }
    });
}
