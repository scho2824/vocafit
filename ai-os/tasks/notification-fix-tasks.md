# Actionable Tasks: Notification System Fixes

Based on `ai-os/plans/notification-fix-plan.md`, the following tasks outline the implementation sequence to resolve the QA bugs.

## Phase 1: Database & RPC Fixes

- [x] **Task DB-F1: Notification Preferences Trigger**
  - Create a migration file (`supabase/migrations/20260308000008_notification_fixes.sql`).
  - Write a trigger function `on_auth_user_created` that inserts `user_id` into `notification_preferences` with `daily_reminders = true` when a new row is added to `auth.users`.
- [x] **Task DB-F2: Timezone Fix for RPC**
  - In the same migration file, use `CREATE OR REPLACE FUNCTION get_pending_training_users()`.
  - Update the timezone comparison in the `WHERE` clause from `AT TIME ZONE 'UTC'` to `AT TIME ZONE 'Asia/Seoul'`.

## Phase 2: Edge Function Security & Performance

- [x] **Task BE-F1: Robust JWT Verification (`send-push`)**
  - Modify `supabase/functions/send-push/index.ts`.
  - If the `Authorization` header matches `SUPABASE_SERVICE_ROLE_KEY`, allow the request.
  - Otherwise, parse the header and use `supabase.auth.getUser(token)` (or equivalent) to verify it. Ensure `user.id` matches the requested `userId` payload.
- [x] **Task BE-F2: Request Batching (`process-daily-reminders`)**
  - Modify `supabase/functions/process-daily-reminders/index.ts`.
  - Implement an array chunking function.
  - Process API invocations in batches (e.g., 50 requests per batch) using a `for...of` loop with `Promise.allSettled`, pausing briefly between batches to prevent timeouts.

## Phase 3: Frontend Permissions Flow

- [x] **Task FE-F1: Create `NotificationPrompt` Component**
  - Create `apps/web/src/components/layout/NotificationPrompt.tsx`.
  - Design a button or banner prompting users to "Enable Notifications".
- [x] **Task FE-F2: Refactor `useNotifications` Hook**
  - Modify `apps/web/src/hooks/useNotifications.ts`.
  - Remove the auto-executed `requestPermission()` from `useEffect`.
  - Export `initPushNotifications` so it can be manually called by the `NotificationPrompt`.
  - Add logic to store the FCM token in `localStorage` and only trigger the Supabase UPSERT when the token is actually new or changed.
- [x] **Task FE-F3: Integrate Prompt into Application**
  - Modify `apps/web/src/app/page.tsx` (or layout).
  - Conditionally render the `NotificationPrompt` if permissions are not yet handled.

## Phase 4: Verification

- [x] **Task QA-1: Type Script Checks**
  - Run `npx tsc --noEmit` in `apps/web` to ensure no new errors were introduced.
- [x] **Task QA-2: Final Bug Verification**
  - Execute end-to-end tests as defined in the plan (Security checks via curl, UI Flow checks, DB Trigger verification).
