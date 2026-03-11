# Research: Payment System Integration (Current State Analysis)

**Date:** 2026-03-11

## 1. Overview
This document analyzes the current state of the VocaFit Payment System implementation based on the `docs/payment-product-spec.md` and the existing codebase. The goal is to identify what has been built, what is missing, and how to complete the MVP PortOne integration.

## 2. Product Requirements
- **Freemium Model:**
  - **Free Tier:** Limited to 3 sentence evaluations per day.
  - **Premium (Pro) Tier:** Unlimited access to AI features.
- **Source of Truth:** PortOne handles actual billing; Supabase `subscriptions` table is a read-only mirror updated via webhooks.
- **UI Flow:** `SentenceBuilderUI` intercepts free users at their limit and shows a `Paywall`. The user can upgrade via `PortOneCheckout` component which redirects or opens a PortOne modal. 

## 3. Codebase Analysis (What Exists)

Upon reviewing the codebase, a significant portion of the frontend UI has already been stubbed out or implemented.

### Frontend Components (Next.js)
- **`apps/web/src/app/pricing/page.tsx`**: **Implemented.** A fully styled pricing page comparing "Basic Learner" (Free) and "VocaFit Pro" (₩4,900/month). It utilizes the `useSubscription` hook to disable the buy button if already subscribed, otherwise it mounts the `PortOneCheckout` component.
- **`apps/web/src/components/payment/PortOneCheckout.tsx`**: **Implemented.** Contains the actual `@portone/browser-sdk/v2` integration (`PortOne.requestPayment`). It uses environment variables like `NEXT_PUBLIC_PORTONE_STORE_ID`. It lacks robust server-side verification post-payment, relying on webhooks to provision access asynchronously.
- **`apps/web/src/components/payment/Paywall.tsx`**: **Implemented.** An overlaid modal that blocks the UI and renders the `PortOneCheckout` component.
- **`apps/web/src/components/features/training/SentenceBuilderUI.tsx`**: **Integrated.** The submission handler checks if `subscription?.status !== 'active' && evaluationCount >= 3`. If true, it triggers `setShowPaywall(true)`.
- **`apps/web/src/hooks/useSubscription.ts`**: **Implemented.** Uses Supabase to select `status, current_period_end, plan_type` from the `subscriptions` table for the current user. It handles client-side "past_due" logic if the period has ended but the webhook hasn't fired yet.

### Backend Components (Supabase)
- **`supabase/functions/portone-webhook/payment.service.ts`**: **Implemented.** Contains a helper class `PaymentService` that fetches the PortOne API access token and verifies payment data against `imp_uid`. 
- **`supabase/functions/portone-webhook/index.ts`**: **MISSING.** The actual Deno edge function that listens to HTTP POST requests from PortOne, verifies the event signature/data via `PaymentService`, and performs the SQL update/insert on the `subscriptions` table.

## 4. The Critical Gap
The frontend correctly initiates payments, but there is no mechanism to physically grant the user premium access in the database once they pay. The missing piece is the **PortOne Webhook Handler (`index.ts`)**.

When a user successfully pays via the PortOne widget, PortOne fires a webhook to our server. We must catch that webhook, look up the `user_id` (usually passed through the `custom_data` or `customer_id` field in the PortOne order), and insert/update a row in the `public.subscriptions` table with `status: 'active'`.

## 5. Next Steps for Implementation
1. Develop the `supabase/functions/portone-webhook/index.ts` edge function to handle the `portone` webhook payload.
2. Link the frontend checkout (`PortOneCheckout.tsx`) to pass the Supabase `user_id` into the PortOne payment payload so the webhook knows which database row to update.
3. Establish robust database synchronization logic inside the webhook (upserting subscription status).
