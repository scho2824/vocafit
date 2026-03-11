# Research: Notification System Architecture

**Status:** Greenfield (Analysis of Required Architecture)
**Date:** 2026-03-08
**Context:** VocaFit currently has *no* notification system implemented. This document analyzes the required architecture, data flow, modules, and risks to implement a robust Notification System for the application, strictly adhering to the VocaFit Tech Stack (Next.js + Supabase + React Native/PWA).

---

## 1. Architecture Overview

Because VocaFit targets children (ages 7-12) and their parents, the Notification System architecture must handle two distinct personas with different delivery mechanisms:
1.  **Parent Persona (Transactional & Reporting):** Requires Email (via Resend/SendGrid) or Push notifications for weekly progress reports, billing, or inactivity alerts.
2.  **Child Persona (Engagement & Streaks):** Requires In-App notifications or very gentle Local/Push notifications to remind them of daily missions and streak maintenance.

**Core Infrastructure Request:**
*   **Database:** Supabase PostgreSQL (Tables: `notifications`, `user_notification_tokens`, `notification_preferences`).
*   **Trigger Mechanism:** Supabase `pg_cron` (for scheduled daily checks) and Database Webhooks (for event-driven triggers like "Streak Lost").
*   **Processing Layer:** Supabase Edge Functions (Deno).
*   **Delivery Gateway:** Firebase Cloud Messaging (FCM) or Apple Push Notification service (APNs) for mobile push; Resend for email.

---

## 2. Data Flow

### A. Event-Driven Flow (E.g., "Session Completed ✅")
1.  **Client:** The child completes a session in `SessionCompleteUI`.
2.  **Backend:** `log_session_safe` RPC is called.
3.  **Database Trigger:** A PostgreSQL trigger detects a new row in `user_sessions`.
4.  **Edge Function:** The trigger fires a Supabase Webhook payload to an Edge Function (`process-notification`).
5.  **Gateway:** The Edge Function formats an encouraging push notification ("Great job today! 🎉") and sends it via FCM to the parent's device (or child's device if permitted).

### B. Scheduled Flow (E.g., "Daily Reminder ⏰")
1.  **Cron Job:** Supabase `pg_cron` runs at 16:00 KST every day.
2.  **Database Query:** The cron executes an RPC that identifies all users who have `dailyWords.length > 0` but no `user_sessions` entry for `today()`.
3.  **Edge Function:** The RPC invokes an Edge Function returning the list of pending user IDs.
4.  **Gateway:** The Edge Function fetches their FCM tokens from `user_notification_tokens` and dispatches the reminder prompt ("Your vocabulary mission is waiting! 🚀").

---

## 3. Key Modules (To Be Implemented)

### 3.1. Database Schema
*   `public.notifications`: Stores the history of sent notifications (Inbox feature).
    *   Columns: `id`, `user_id`, `title`, `body`, `type` (reminder, achievement, report), `read_at`, `created_at`.
*   `public.user_push_tokens`: Stores FCM/APNs device tokens.
    *   Columns: `id`, `user_id`, `token`, `platform` (ios, android, web), `created_at`.
*   `public.notification_preferences`: Stores opt-in/opt-out booleans.
    *   Columns: `user_id`, `daily_reminders` (bool), `weekly_reports` (bool).

### 3.2. Supabase Edge Functions
*   `supabase/functions/send-push/`: Handles communication with FCM/APNs.
*   `supabase/functions/send-email/`: Handles communication with Resend for parent reports.
*   `supabase/functions/cron-daily-reminders/`: Scheduled function evaluating who needs a nudge.

### 3.3. Frontend Integration (Next.js / PWA)
*   `hooks/useNotifications.ts`: Custom hook to request browser/device permissions, get the FCM token, and save it to Supabase on login.
*   `components/features/notifications/NotificationBellUI.tsx` (Optional): An in-app inbox to view missed achievements.

---

## 4. Important Functions (Signatures)

### Backend (PostgreSQL RPC / Deno)
```sql
-- Evaluates who hasn't trained today
CREATE OR REPLACE FUNCTION get_pending_training_users()
RETURNS TABLE(user_id UUID, unlearned_count INT) AS $$ ... $$;
```

```typescript
// Edge Function Payload
interface SendPushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>; // e.g. { route: '/training' }
}
```

### Frontend (React hooks)
```typescript
// Registers device token
async function registerDeviceToken(token: string, platform: 'web'|'ios'|'android') {
   await supabase.from('user_push_tokens').upsert({ token, platform });
}

// Subscribes to realtime in-app notifications
function subscribeToNotifications(userId: string) {
   supabase.channel(`public:notifications:user_id=eq.${userId}`).on('INSERT', ...);
}
```

---

## 5. Risks & Considerations

1.  **Child Safety & Privacy (COPPA/GDPR-K):** Push notifications to a child's device must be strictly about positive reinforcement and app mechanics. Absolutely no marketing or third-party tracking can be sent. Email addresses (for parents) must be rigorously separated from child profiles.
2.  **"Spam" Perception (The Annoyance Factor):** If a child is sick or taking a break, aggressive daily reminders will cause the parent to uninstall the app.
    *   **Mitigation:** Implement a strict "Max 1 reminder per day" rule, and an automatic "Silence after 3 days of inactivity" rule.
3.  **FCM Token Rot:** Device tokens expire or devices get disconnected.
    *   **Mitigation:** The frontend `useNotifications` hook must refresh and verify the token on every app launch and purge dead tokens if FCM returns a `NotRegistered` error.
4.  **Deliverability / Cold Starts:** Edge Functions have cold starts. For mass broadcasts (e.g., 50,000 children getting a reminder at 4 PM), the Edge Function might timeout before looping through all users.
    *   **Mitigation:** Use bulk-send APIs provided by FCM rather than looping `fetch` requests individually, and batch users in groups of 500 per Edge Function invocation.
5.  **State Desync:** Suppose a push notification says "Learn 3 words today!", but the database actually says `dailyMission.length === 0`.
    *   **Mitigation:** The cron/trigger *must* evaluate the exact same `get_daily_mission()` RPC logic the frontend uses right before queuing the notification.
