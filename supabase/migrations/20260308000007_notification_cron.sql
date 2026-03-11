-- Migration: Scheduled Notifications Cron Job

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily reminder job
-- Runs every day at 07:00 UTC (Which is 4:00 PM KST)
SELECT cron.schedule(
    'process-daily-reminders-job',
    '0 7 * * *',
    $$
    SELECT net.http_post(
        url := (current_setting('app.settings.edge_function_base_url', true) || '/process-daily-reminders'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
);
