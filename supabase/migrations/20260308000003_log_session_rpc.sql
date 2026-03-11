-- Safely log a user session, preventing duplicate entries within a short timeframe
create or replace function public.log_session_safe(p_completed_words text[])
returns json
language plpgsql
security definer
as $$
declare
    v_user_id uuid;
    v_recent_session_exists boolean;
    v_result record;
begin
    -- 1. Get the authenticated user ID
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Not authenticated';
    end if;

    -- 2. Check for an exactly matching session within the last 2 minutes
    -- This handles the React 18 Strict Mode double-fire (which happens within milliseconds)
    -- and prevents users from spamming the completion endpoint with the same payload.
    select exists (
        select 1
        from public.user_sessions
        where user_id = v_user_id
          and completed_words = p_completed_words
          and completed_at > (now() - interval '2 minutes')
    ) into v_recent_session_exists;

    -- 3. If a duplicate exists, silently return success without inserting
    if v_recent_session_exists then
        return json_build_object('status', 'success', 'message', 'duplicate ignored');
    end if;

    -- 4. Otherwise, insert the new session
    insert into public.user_sessions (user_id, completed_words)
    values (v_user_id, p_completed_words)
    returning * into v_result;

    return json_build_object('status', 'success', 'data', row_to_json(v_result));
end;
$$;
