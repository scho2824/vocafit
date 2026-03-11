-- Migration: Notification System Database Infrastructure (Tables & RPC)

-- 1. Create Tokens Migration (user_push_tokens)
CREATE TABLE public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
ON public.user_push_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Create Preferences Migration (notification_preferences)
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_reminders BOOLEAN DEFAULT true,
    weekly_reports BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preferences_modtime
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE PROCEDURE update_notification_preferences_modtime();

-- 3. Create Pending Users RPC (get_pending_training_users)
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
            -- Exclude users with today's entries in user_sessions
            SELECT 1 FROM public.user_sessions us
            WHERE us.user_id = u.id 
            AND (us.created_at AT TIME ZONE 'UTC')::DATE = (now() AT TIME ZONE 'UTC')::DATE
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
