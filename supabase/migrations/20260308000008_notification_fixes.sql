-- Migration: Notification System Fixes (Trigger & Timezone)

-- 1. Trigger: Auto-create notification_preferences for new users
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id, daily_reminders, weekly_reports)
    VALUES (NEW.id, true, true)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.on_auth_user_created();


-- 2. Timezone Fix: Update get_pending_training_users RPC to use Asia/Seoul time
CREATE OR REPLACE FUNCTION public.get_pending_training_users()
RETURNS TABLE (user_id UUID, unlearned_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH eligible_users AS (
        SELECT u.id AS user_id
        FROM auth.users u
        JOIN public.notification_preferences np ON np.user_id = u.id
        WHERE np.daily_reminders = true
        AND NOT EXISTS (
            -- Exclude users with today's entries in user_sessions (KST)
            SELECT 1 FROM public.user_sessions us
            WHERE us.user_id = u.id 
            AND (us.created_at AT TIME ZONE 'Asia/Seoul')::DATE = (now() AT TIME ZONE 'Asia/Seoul')::DATE
        )
    ),
    user_unlearned AS (
        SELECT 
            eu.user_id,
            (SELECT COUNT(*) FROM public.vocabulary v WHERE v.word_id NOT IN (
                SELECT us.word_id FROM public.user_sessions us WHERE us.user_id = eu.user_id
            )) AS unlearned
        FROM eligible_users eu
    )
    SELECT uu.user_id, uu.unlearned::INT
    FROM user_unlearned uu
    WHERE uu.unlearned > 0;
END;
$$;
