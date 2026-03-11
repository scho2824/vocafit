# Actionable Tasks: PortOne Payment Implementation

This document breaks down the PortOne Implementation Plan (`ai-os/plans/portone-payment-plan.md`) into granular, actionable tasks grouped by architectural layer, strictly adhering to the VocaFit Micro-SaaS guidelines.

## 1. Database (Supabase)
- [x] **Migration: Payment Tables**
  - Create `subscriptions` table (`user_id`, `status`, `plan_type`, `current_period_end`, `billing_key`).
  - Create `payment_logs` table for history and auditing.
- [x] **Database RLS Policies**
  - Secure `subscriptions` so users can only `SELECT` their own rows.
  - Ensure Edge Functions (Service Role) can `INSERT` and `UPDATE` records.

## 2. Backend (Supabase Edge Functions)
- [x] **Setup Deno Edge Function API**
  - Create `supabase/functions/portone-webhook/index.ts` to receive asynchronous PortOne webhooks.
- [x] **Implement Payment Verification Service**
  - Create `supabase/functions/portone-webhook/payment.service.ts`.
  - Fetch access token from PortOne REST API.
  - Verify webhook payment `imp_uid` against expected order amount.
- [x] **Implement Database Synchronization**
  - Update `user_id` subscription status in `public.subscriptions` upon successful `'paid'` webhook event.
  - Implement retry and polling logic for webhook failures to ensure state consistency.

## 3. Frontend (Next.js Application)
- [x] **Initialize Integration**
  - Install PortOne V2 Browser SDK (or script injection mechanism) in `apps/web`.
- [x] **Create UI: Pricing Page**
  - Build `apps/web/src/app/pricing/page.tsx` displaying the Freemium vs. VocaFit Pro tiers.
- [x] **Create Component: Checkout Flow**
  - Build `apps/web/src/components/payment/PortOneCheckout.tsx` to handle the SDK initialization and client-side payment request to PortOne.
- [x] **Create Component: Paywall**
  - Build `apps/web/src/components/payment/Paywall.tsx` to act as an overlay stopping Free Tier users from exceeding their quota.
- [x] **State Management: Subscription Hook**
  - Create a React Query hook (e.g., `useSubscription.ts`) to cache the active user's subscription status from Supabase.
- [x] **Integrate Paywall into Training Core**
  - Connect the `Paywall` component to `apps/web/src/components/features/training/SentenceBuilderUI.tsx` to intercept actions based on the `useSubscription` status and daily free limits.
- [x] **Create UI: Customer Portal / Billing**
  - Build a settings interface allowing parents to view their active subscription and cancel via PortOne's Billing Key management.
