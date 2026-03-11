import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface LogSessionPayload {
    completedWords: string[];
}

export function useLogSession() {
    return useMutation({
        mutationFn: async ({ completedWords }: LogSessionPayload) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Must be logged in to save session");
            }

            const { data, error } = await supabase
                .rpc('log_session_safe', {
                    p_completed_words: completedWords
                });

            if (error) {
                console.error("Failed to log session:", error);
                throw new Error("Failed to save progress");
            }

            return data;
        }
    });
}
