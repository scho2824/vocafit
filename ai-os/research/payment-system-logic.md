# Research: Payment System Logic & Business Rules

**Status:** Greenfield (Analysis of Required Architecture)
**Date:** 2026-03-08
**Context:** VocaFit currently has *no* payment or billing system implemented. This document analyzes the required architecture, data flow, modules, and business logic to implement a SaaS subscription model for the application via the PortOne (포트원) payment gateway, strictly tailored to the VocaFit App model.

---

## 1. Target Users & Business Rules

### Target Users
VocaFit serves a dual-persona structure regarding payments:
1.  **The Learner (End-User):** The individual (adult, student, or child) who uses the app daily. They consume the quotas (daily missions, sentence evaluations).
2.  **The Buyer (Payer):** The individual who inputs the credit card and manages the subscription. For adult learners, this is the same as the Learner. For younger learners, this is the parent or guardian. The payment gateway interface must be trusted, frictionless, and easily accessible to the Buyer without interrupting the Learner's flow unnecessarily.

### Core Business Logic (Freemium Model)
The application enforces usage limits based on the synchronized backend subscription status. Access control is granted via conditional rendering in the frontend and validated by API limitations in the backend.

**Tier 1: Free Tier (Basic Learner)**
*   **Daily Mission Access:** Locked to a maximum of 3 new vocabulary words per day.
*   **AI Sentence Building:** Locked to a maximum of 3 AI sentence evaluations per day.
*   **History Access:** Read-only access to previously learned words. AI contextual variation generation is locked.

**Tier 2: Premium Tier (VocaFit Pro)**
*   **Daily Mission Access:** Unlimited daily words.
*   **AI Sentence Building:** Unlimited AI evaluations and unlimited retries for sentence building feedback.
*   **History Access:** Unrestricted access to historical performance and dynamic AI variation generation.

**Subscription States (Graceful Degradation)**
*   **Active:** User enjoys Premium Tier benefits immediately.
*   **Canceled (Pending End):** If a user cancels via PortOne, their status remains `active` but a `cancel_at_period_end` flag is set to `true`. They retain Premium access until the exact `current_period_end` timestamp.
*   **Past Due / Inactive:** If billing fails or the period ends, the status updates strictly to an inactive state. The app instantly down-tiers the user to Tier 1 limitations. Historical data (e.g., words previously learned or stats) is *never* deleted, but premium features are locked behind the paywall again.

---

## 2. Architecture Overview

Because VocaFit targets the Korean market, **PortOne (포트원)** is chosen as the payment gateway. PortOne abstracts the complexity of connecting to local PG (Payment Gateway) companies (like KG Inicis, Toss Payments, KCP) and provides a unified API for standard checkouts and subscription billing keys.

**Core Infrastructure Request:**
*   **Payment Gateway:** PortOne (SDK for checkout UI, API for billing key management and recurring payments).
*   **Database:** Supabase PostgreSQL (Tables: `subscriptions`, `billing_keys`, `payment_logs`).
*   **Backend Processing:** Supabase Edge Functions (Deno) serving as webhooks to receive asynchronous payment status updates from PortOne.
*   **Frontend Checkouts:** Next.js Server Actions or API Routes to generate unique merchant UIDs and initiate the PortOne SDK securely.

---

## 3. Data Flow

### A. Subscription Purchase Flow (Initial Payment)
1.  **Client (Buyer View):** The user hits the Free Tier limit and is presented with a Paywall, or clicks "Upgrade to Premium" on the pricing page.
2.  **Next.js Server:** An API Route (`/api/initiate-payment`) generates a unique `merchant_uid` and prepares the payment payload.
3.  **Gateway (PortOne SDK):** Formatted payment details pass into the PortOne JavaScript SDK. The user selects their payment method (e.g., credit card), enters details, and authenticates.
4.  **Client (Post-Auth):** The SDK returns an `imp_uid` (PortOne unique ID) to the client upon successful local authentication.
5.  **Next.js Server (Verification):** The client sends the `imp_uid` to another API Route (`/api/verify-payment`), which securely contacts the PortOne REST API to confirm the payment amount matches the expected subscription price, preventing client-side forgery.
6.  **Database Provisioning:** Upon successful verification, the server inserts a row into the Supabase `subscriptions` table, linking the `user_id` to the granted tier.
7.  **Client Access:** The VocaFit app reads the newly created subscription state and instantly unlocks Premium AI features.

### B. Recurring Billing & Webhook Synchronization
1.  **Scheduled Charge:** For subscription models, PortOne (or a separate CRON worker via PortOne API) automatically charges the registered billing key on the scheduled renewal date.
2.  **Webhook Trigger:** PortOne fires an asynchronous webhook event to a pre-configured VocaFit URL (e.g., `payment.status.paid` or `payment.status.failed`).
3.  **Edge Function:** A Supabase Edge Function (`portone-webhook`) catches the event. It verifies the webhook signature/IP to ensure it arrived securely from PortOne, checks the payment status, and updates the `current_period_end` sequence in the `subscriptions` table.
4.  **Client Access:** The VocaFit app reads the updated `current_period_end` and ensures continuous service without the user noticing the background renewal.

---

## 4. Key Modules (To Be Implemented)

### 4.1. Database Schema
*   `public.subscriptions`: The ultimate source of truth within VocaFit.
    *   Columns: `id`, `user_id`, `status` (active, past_due, canceled), `plan_type` (e.g., monthly, yearly), `current_period_end`, `cancel_at_period_end`, `billing_key_id`.
*   `public.billing_keys`: Secure references to the PortOne billing keys for recurring charges.
    *   Columns: `id`, `user_id`, `customer_uid` (PortOne's identifier for the card), `card_name`, `last_4_digits`.
*   `public.payment_logs`: Transaction history for parent receipts and debugging.
    *   Columns: `id`, `user_id`, `imp_uid`, `amount`, `status`, `created_at`.

### 4.2. Backend Integration
*   `supabase/functions/portone-webhook/index.ts`: The central Deno function handling all asynchronous PortOne events, validating the source, and updating the database using the Service Role Key.
*   `apps/web/src/app/api/payment/verify/route.ts`: Secure API route verifying client-side payment tokens against the PortOne REST API.
*   `apps/web/src/app/api/payment/schedule/route.ts`: API route to handle scheduling the next recurring charge with PortOne's API.

### 4.3. Frontend Components (Next.js)
*   `app/pricing/page.tsx`: Displays the Freemium vs. Premium tier comparisons.
*   `components/features/billing/PaywallModal.tsx`: The UI component that slides up when a user exhausts their Free Tier limits (e.g., after the 3rd sentence evaluation).
*   `components/features/billing/ManageBillingButton.tsx`: A button in the typical dashboard/settings view allowing the user to view their next billing date or cancel their subscription.
*   `hooks/useSubscription.ts`: A React Query hook that fetches the user's current subscription status from Supabase (typically cached heavily) to gate Premium features.

---

## 5. Important Functions (Signatures)

### Backend (Next.js API Routes - Verification)
```typescript
// SECURE VERIFICATION: Checks the imp_uid against PortOne servers
export async function POST(req: Request) {
  const { imp_uid, merchant_uid } = await req.json();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch PortOne Access Token securely server-side
  // 2. Fetch Payment details using imp_uid via PortOne REST API
  // 3. Compare Payment Amount (amount_to_be_paid === amount_paid)
  // 4. Update Supabase public.subscriptions table using Admin Client
  // 5. Return Success
}
```

### Edge Function (Webhook Parsing)
```typescript
// supabase/functions/portone-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const body = await req.json();
  const { imp_uid, merchant_uid, status } = body;
  
  // 1. Verify Request IP matches PortOne allowed IP list for security
  // 2. Fetch Payment details via PortOne REST API to confirm authenticity
  // 3. If status === 'paid', extend public.subscriptions current_period_end
  // 4. If status === 'failed', mark public.subscriptions status 'past_due'
  // 5. Update public.payment_logs
  // 6. Return 200 OK immediately so PortOne stops retrying
});
```

---

## 6. Risks & Considerations

1.  **Client-Side Forgery:** A malicious client could alter the JavaScript SDK payload to declare a payment "successful" without actually paying, or tamper with the price amount.
    *   *Mitigation:* The critical security principle is that the `imp_uid` returned by the client SDK *must* be sent to the VocaFit Next.js server (`/api/verify-payment`), which then queries PortOne directly. The database is updated *only* based on the server-to-server PortOne API response, entirely ignoring the client's claim.
2.  **Webhook Failures (Desync):** If the Edge Function fails or timeouts during a recurring payment webhoook, the user may be incorrectly locked out of their Premium features even though they were charged.
    *   *Mitigation:* Idempotency and robust error logging are crucial. PortOne will retry failed webhooks if the endpoint does not return a HTTP 200 OK status. Ensure the database writes handle concurrent processing (e.g., ignoring duplicate `imp_uid` webhook deliveries).
3.  **Local Development & Testing:** Testing webhooks locally with PortOne can be tedious as it requires a local tunneling solution (e.g., ngrok or Cloudflare Tunnels) to expose the local Supabase Edge Functions to PortOne's webhook dispatchers.
4.  **Security (Row Level Security):** The `subscriptions` table must be strictly read-only for authenticated users. The `billing_keys` table should be completely inaccessible to the client, accessible only via Service Role keys in API routes or Edge Functions.
5.  **Free Tier Exhaustion:** Clarify what happens when a user drops to the free tier. Do they lose access to their vocabulary history, or just the AI evaluations? This business logic must be clearly defined in the `useSubscription` hook (as outlined in Business Logic: Historical access remains, AI execution locks).
