# Implementation Plan: Notification System Fixes

## Goal
To address the critical security, integration, edge-case, and performance issues identified in the Notification System QA report (`docs/bug-reports.md`), ensuring the system is secure, reliable, and user-friendly.

## Approach
-   **Security (send-push):** Implement robust JWT verification in the `send-push` Edge Function to ensure only authorized users can send notifications to themselves, while still allowing the Cron job (via Service Role Key) to send batch pushes.
-   **Integration (Frontend Permissions):** Remove the eager `useEffect` permission request. Introduce a dedicated, user-initiated UI element (e.g., a "Enable Notifications" button within a settings modal or a dedicated top banner on the dashboard) to request permission following browser guidelines.
-   **Integration (DB Trigger):** Create a PostgreSQL trigger to automatically insert a row into `notification_preferences` whenever a new user is created in the `auth.users` table, ensuring they are eligible for the daily reminder RPC.
-   **Edge Case (Timezone):** Modify the `get_pending_training_users` RPC to compare dates using KST (Asia/Seoul) instead of UTC, aligning the database query's logic with the physical time the Cron job runs (4 PM KST).
-   **Performance (Timeout):** Implement chunking/batching in `process-daily-reminders`. Instead of firing all requests concurrently with `Promise.allSettled`, we will process the API calls in manageable batches (e.g., 50 at a time) to avoid hitting connection limits and mitigate Deno function timeout risks.
-   **Optimization (Frontend Token Upsert):** Adjust `useNotifications` to only upsert the token to the database if the token has actually changed or on initial grant, reducing unnecessary `UPDATE` requests.

## Files to Modify & New Files

### Frontend
-   `apps/web/src/hooks/useNotifications.ts`
    -   **[MODIFY]** Remove the auto-request logic in `useEffect`. Export the `initPushNotifications` function so it can be triggered by a UI event. Add logic to cache the token locally and only upsert if it changes.
-   `apps/web/src/app/page.tsx`
    -   **[MODIFY]** Remove the eager `useNotifications()` call. 
-   `apps/web/src/components/layout/NotificationPrompt.tsx`
    -   **[NEW]** Create a UI component (banner or modal) that explains the benefit of notifications and provides a button for the user to click, initiating the permission request.

### Backend (Edge Functions)
-   `supabase/functions/send-push/index.ts`
    -   **[MODIFY]** Add comprehensive JWT verification using `@supabase/supabase-js` `getUser` or `verify` methods. Accept requests if they have a valid Service Role Key (for Cron) OR a valid user JWT where the `sub` (user ID) matches the requested `userId`.
-   `supabase/functions/process-daily-reminders/index.ts`
    -   **[MODIFY]** Implement a chunking algorithm (e.g., using a utility function or simple `for` loop with array slicing) to process `supabase.functions.invoke('send-push')` in batches of 50.

### Database
-   `supabase/migrations/20260308000008_notification_fixes.sql`
    -   **[NEW]** Create a new migration file.
    -   Add a trigger function `on_auth_user_created` and attach it to `auth.users` to insert default preferences into `notification_preferences`.
    -   `CREATE OR REPLACE FUNCTION public.get_pending_training_users()`: Update the `WHERE` clause to cast timestamps to `AT TIME ZONE 'Asia/Seoul'` instead of `UTC`.

## Verification Plan

### Automated Tests
-   Run `npx tsc --noEmit` in `apps/web` to ensure no new TypeScript issues are introduced.

### Manual Verification
-   **Security:** Attempt to `curl` the `send-push` endpoint without a token, with a fake token, and with a valid user token trying to send a push to a *different* `userId`. All should fail (401/403). Only requests with the valid Service Role Key or matching Auth JWT should succeed.
-   **UI Flow:** Open the app in an incognito window, log in, and verify the browser does *not* automatically prompt for permissions perfectly upon mounting. Click the new "Enable Notifications" button and verify the prompt appears.
-   **DB Trigger:** Manually sign up a new test user in the Supabase Dashboard (or via app) and check the `notification_preferences` table to ensure a row was automatically generated.
-   **Timezone:** In the Supabase SQL Editor, simulate the RPC logic: Insert a `user_sessions` record with a `created_at` of `now() - interval '8 hours'` (representing an early morning KST session). Run the RPC and ensure that user is *excluded* from the pending list.
