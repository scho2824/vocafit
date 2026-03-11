import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DailyMissionWord {
    id: string;
    word: string;
}

export function useDailyMission() {
    return useQuery({
        queryKey: ['dailyMission'],
        queryFn: async (): Promise<DailyMissionWord[]> => {
            // For MVP: Fetch 3 random words.
            // In PostgreSQL, `order by random()` is easy but not infinitely scalable. 
            // It's perfectly fine for a localized MVP dataset.
            const { data, error } = await supabase
                .rpc('get_daily_mission');

            if (error) {
                console.error("Error fetching daily mission via RPC:", error);
                throw new Error('Failed to load daily mission');
            }

            // Shuffle the results locally so the child doesn't always get the same first 3 words
            // if the database hasn't grown yet.
            const shuffled = [...data].sort(() => 0.5 - Math.random());

            return shuffled.map(item => ({
                id: item.id,
                word: item.target_word
            }));
        },
        staleTime: 1000 * 60 * 60, // 1 hour (don't refetch the mission if they navigate away briefly)
    });
}
