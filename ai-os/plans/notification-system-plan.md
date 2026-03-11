# Implementation Plan: Notification System

## 1. Goal
Implement a robust, cross-platform Notification System for VocaFit targeting two distinct personas: Parents (transactional/reporting) and Children (engagement/reminders). The system must support push notifications (FCM or APNs) for devices and email for parents, triggered both by database events (webhooks) and scheduled routines (cron).

## 2. Approach
*   **Database First:** Build tables to store notification history (`notifications`), device pushing tokens (`user_push_tokens`), and user preferences (`notification_preferences`).
*   **Backend Automation:** Utilize Supabase `pg_cron` for scheduling (e.g., daily 4 PM KST reminders) and Database Webhooks/Triggers for real-time events (e.g., session completed).
*   **Edge Functions via Deno:** Write Supabase Edge Functions to act as the intermediary securely contacting Firebase Cloud Messaging (FCM) or Resend (Emails).
*   **Client Capabilities (PWA/Next.js):** Build a custom React hook `useNotifications` to request browser/device permissions and upsert the associated device token into Supabase.

## 3. Files to Modify / Create

### Database (Supabase Migrations)
*   **[NEW]** `supabase/migrations/xxxx_create_notification_tables.sql`: Create `notifications`, `user_push_tokens`, `notification_preferences` tables and RLS policies.
*   **[NEW]** `supabase/migrations/xxxx_cron_daily_reminders.sql`: Setup `pg_cron` extension and scheduled jobs for evaluating pending users.

### Backend (Supabase Edge Functions)
*   **[NEW]** `supabase/functions/send-push/index.ts`: The Deno function responsible for sending FCM payloads.
*   **[NEW]** `supabase/functions/process-daily-reminders/index.ts`: The Deno function triggered by the cron job to batch notifications.

### Frontend (Next.js Application)
*   **[NEW]** `apps/web/src/hooks/useNotifications.ts`: React hook handling the Permissions API and Service Worker registration for Push.
*   **[NEW]** `apps/web/public/firebase-messaging-sw.js`: Firebase Cloud Messaging Service Worker (required if using FCM for web/PWA push).
*   **[MODIFY]** `apps/web/src/app/layout.tsx` or `app/page.tsx`: Inject the `useNotifications` hook to eagerly request device tokens after successful authentication.
*   **[MODIFY]** `apps/web/src/components/features/training/SessionCompleteUI.tsx` (Optional): Dispatch an event or webhook trigger (handled automatically by the `user_sessions` DB insert).

## 4. Step-by-Step Tasks

### Phase 1: Database Infrastructure

**1. Schema: Push Tokens (`user_push_tokens`)**
*   `id`: UUID, Primary Key.
*   `user_id`: UUID, Foreign Key to `auth.users(id)`, ON DELETE CASCADE.
*   `token`: TEXT, Unique (to prevent duplicate entries/spam).
*   `platform`: TEXT (e.g., 'web', 'ios', 'android').
*   `created_at`: TIMESTAMPTZ, Default `now()`.
*   **RLS Policies:** 
    *   Enable RLS.
    *   `SELECT`, `INSERT`, `UPDATE`, `DELETE`: Users can only manage tokens where `auth.uid() = user_id`.

**2. Schema: Notification Preferences (`notification_preferences`)**
*   `id`: UUID, Primary Key.
*   `user_id`: UUID, Foreign Key to `auth.users(id)`, Unique, ON DELETE CASCADE.
*   `daily_reminders`: BOOLEAN, Default `true`. (Toggles "Do your daily mission!" push).
*   `weekly_reports`: BOOLEAN, Default `true`. (Toggles "Weekly progress" emails).
*   `updated_at`: TIMESTAMPTZ, Default `now()`.
*   **RLS Policies:**
    *   Enable RLS.
    *   `SELECT`, `UPDATE`: Users can only access/modify where `auth.uid() = user_id`.
    *   Service Role bypasses RLS to read preferences during Edge Function CRON jobs.

**3. Logic: Pending Users RPC (`get_pending_training_users()`)**
*   **Goal:** Find active users who need a daily reminder push notification.
*   **Logic Steps:**
    1.  Select `user_id` from active `auth.users`.
    2.  **JOIN** `notification_preferences` to ensure `daily_reminders = true`.
    3.  **EXCLUDE** users who have an entry in `user_sessions` where `created_at` > `CURRENT_DATE` (they already studied today).
    4.  **EXCLUDE** users who have exhausted the `vocabulary` table (they have no unlearned words left, so a reminder is useless).
*   **Returns:** `TABLE(user_id UUID, unlearned_count INT)`.

### Phase 2: Edge Functions (Delivery)
1.  **Firebase Setup:** The Admin must create a Firebase project and generate a Service Account Key. Inject this key into Supabase Vault/Secrets.
2.  **Create `send-push`:** Write the Deno function `supabase/functions/send-push/index.ts`. It takes a `userId`, `title`, and `body`, securely retrieves the FCM token from the database, and dispatches the request to the FCM HTTP V1 API. Add error handling for stale tokens.
3.  **Create `process-daily-reminders`:** Write the Deno function `supabase/functions/process-daily-reminders/index.ts`. It calls the `get_pending_training_users` RPC, chunks the results, and asynchronously dispatches payloads to the `send-push` function (or executes bulk sends directly).

### Phase 3: Automation & Scheduled Triggers
1.  **Enable `pg_cron`:** In Supabase, enable the `pg_cron` extension.
2.  **Schedule the Cron:** Write the SQL query calling `cron.schedule('4 PM KST Reminder', '0 7 * * *', $$ select net.http_post(url:='<EDGE_FUNCTION_URL>') $$)`.

### Phase 4: Frontend Integration & Consent
1.  **Firebase Client Setup:** Install `firebase` client SDK. Create `firebase-messaging-sw.js` in the public directory to handle background push reception.
2.  **Create Custom Hook:** Develop `useNotifications.ts`.
    ```typescript
    // Example pseudocode snippet for the hook:
    export function useNotifications() {
        const { session } = useAuth();
        
        useEffect(() => {
            if (!session) return;
            async function requestPermission() {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const token = await getToken(messaging, { vapidKey: '...' });
                    await supabase.from('user_push_tokens').upsert({ token, platform: 'web' });
                }
            }
            requestPermission();
        }, [session]);
    }
    ```
3.  **Integrate Hook:** Eagerly call `useNotifications` in the main dashboard after login.

## 5. Tradeoffs
*   **FCM via Firebase vs APNs directly:** Using Firebase Cloud Messaging acts as a great abstraction layer over both Android and Web pushing, and delegates APNs routing. The tradeoff is adding the Google/Firebase dependency to the Web App bundle. Given Next.js tree-shaking and dynamic imports, the payload impact should be minimal, but service workers add complexity to Next.js routing.
*   **Cron vs. Client-Side Scheduling:** Relying on `pg_cron` guarantees the Push gets sent even if the user hasn't opened the app in a week. The tradeoff is cold-start durations on Edge functions. If VocaFit had 100,000 DAUs, the Cron -> Edge Function loop might experience Deno timeout limits and require a real job queue (AWS SQS/Kafka). For MVP Micro-SaaS, `pg_cron` iterating in batches of 500 is perfectly acceptable.

## 6. Risks
*   **Stale Tokens:** If users revoke permission via OS settings, the backend holds a "dead" token. Continuous pushing to dead tokens can result in Firebase throttling the project sender ID.
    *   *Mitigation:* The `send-push` Edge Function must look for the "NotRegistered" error from Firebase and immediately delete the token row from the `user_push_tokens` table.
*   **Compliance (COPPA/GDPR-K):** A child might receive a push notification containing tracking SDKs from Firebase. Data collection must be strictly disabled.
    *   *Mitigation:* Disable Firebase Analytics entirely. Use Firebase *only* for Cloud Messaging transit.
*   **Spam Sensitivity:** Sending "Do your vocab!" pushes every single day will annoy parents quickly.
    *   *Mitigation:* Cap daily reminders. Consider building an automatic "cooling down" period into the `get_pending_training_users()` RPC: e.g., if the user hasn't done a session in 4 consecutive days, stop sending push notifications until they reopen the app organically.
