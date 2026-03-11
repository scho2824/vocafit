import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'none';

export interface SubscriptionData {
    status: SubscriptionStatus;
    current_period_end: string | null;
    plan_type: string | null;
}

export function useSubscription() {
    return useQuery<SubscriptionData>({
        queryKey: ['subscription'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { status: 'none', current_period_end: null, plan_type: null };

            const { data, error } = await supabase
                .from('subscriptions')
                .select('status, current_period_end, plan_type')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error || !data) {
                return { status: 'none', current_period_end: null, plan_type: null };
            }

            // Check if subscription has expired but status wasn't updated by webhook
            if (data.status === 'active' && data.current_period_end) {
                if (new Date(data.current_period_end) < new Date()) {
                    return {
                        status: 'past_due',
                        current_period_end: data.current_period_end,
                        plan_type: data.plan_type
                    };
                }
            }

            return {
                status: data.status as SubscriptionStatus,
                current_period_end: data.current_period_end,
                plan_type: data.plan_type
            };
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}
