# Actionable Tasks: Notification System

This document breaks down the Notification System Implementation Plan (`ai-os/plans/notification-system-plan.md`) into granular, actionable tasks grouped by architectural layer.

---

## Phase 1: Database Infrastructure (Supabase)

- [x] **Task DB-1: Create Tokens Migration (`user_push_tokens`)**
  - Create table with `id` (UUID), `user_id` (FK auth.users), `token` (Unique Text), `platform` (Text), `created_at`.
  - Setup RLS policies restricting `SELECT`, `INSERT`, `UPDATE`, `DELETE` to `auth.uid() = user_id`.
- [x] **Task DB-2: Create Preferences Migration (`notification_preferences`)**
  - Create table with `id`, `user_id` (Unique FK), `daily_reminders` (Bool, default true), `weekly_reports` (Bool, default true).
  - Setup RLS policies for user read/update access.
- [x] **Task DB-3: Create Pending Users RPC (`get_pending_training_users`)**
  - Write Postgres function returning `TABLE(user_id UUID, unlearned_count INT)`.
  - Filter 1: Join `notification_preferences` ensuring `daily_reminders = true`.
  - Filter 2: Exclude users with today's entries in `user_sessions`.
  - Filter 3: Exclude users who have learned all words in the `vocabulary` table.

---

## Phase 2: Edge Functions (Delivery)

- [x] **Task BE-1: Firebase Admin Setup**
  - Set up a Firebase project and securely inject the Service Account Key into Supabase Vault/Secrets.
- [x] **Task BE-2: Implement `send-push` Edge Function**
  - Create `supabase/functions/send-push/index.ts`.
  - Accept `userId`, `title`, and `body`.
  - Retrieve FCM token from DB and dispatch to FCM HTTP V1 API. Handle and delete stale tokens.
- [x] **Task BE-3: Implement `process-daily-reminders` Edge Function**
  - Create `supabase/functions/process-daily-reminders/index.ts`.
  - Call `get_pending_training_users` RPC.
  - Chunk results and asynchronously dispatch payloads to the `send-push` function.

---

## Phase 3: Automation & Scheduled Triggers

- [x] **Task CRON-1: Enable and Schedule Cron**
  - Enable `pg_cron` extension in Supabase.
  - Write SQL query to schedule: `cron.schedule('4 PM KST Reminder', '0 7 * * *', $$ select net.http_post(url:='<EDGE_FUNCTION_URL>') $$)`.

---

## Phase 4: Frontend Integration & Consent (Next.js)

- [x] **Task FE-1: Firebase Client Configuration**
  - Install `firebase` client SDK.
  - Add `firebase-messaging-sw.js` to `apps/web/public`.
- [x] **Task FE-2: Implement `useNotifications` Hook**
  - Create `apps/web/src/hooks/useNotifications.ts`.
  - Handle Permissions API and token registration with the backend.
- [x] **Task FE-3: Integrate Permissions Flow**
  - Inject the hook into the dashboard layout to eagerly request tokens post-login.
