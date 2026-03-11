# Payment System Fix Plan

## 1. Problem Identification and Root Causes

| Issue | Root Cause |
| :--- | :--- |
| **[CRITICAL] DB Schema Mismatch** | `supabase/functions/portone-webhook/index.ts` attempts to `insert` into `payment_logs` without the `merchant_uid` column (which is required by the `payment_logs` schema). It also tries to insert a `raw_data` JSONB object, which does not exist in the DB schema for that table. |
| **[HIGH] Idempotency Race Condition** | The webhook handles idempotency via a `select` followed by an `insert`. Under concurrent load (e.g., duplicated webhooks from PortOne), both requests pass the `select` check in parallel. The second `insert` hits the database's `UNIQUE(imp_uid)` constraint, throwing an unhandled 500 error back to PortOne. |
| **[SECURITY HIGH] IDOR via customData** | The `userId` is generated on the client in `PortOneCheckout.tsx` and blindly trusted by the webhook to activate the subscription. A user can manipulate the payload in their browser to insert *another* user's UUID, effectively paying for someone else's upgrade. |
| **[MEDIUM] Cancellation State Handling** | When the webhook receives a `cancelled` payload, it immediately sets the subscription `status` to `'canceled'`. It does not respect the `current_period_end` date, instantly revoking the user's remaining paid time. |

---

## 2. Proposed Architectural & Code Fixes

### Fix 1: DB Schema Mismatch (Data Alignment)
**Target:** `supabase/functions/portone-webhook/index.ts`
**Approach:** 
- Stop passing `raw_data` to the `payment_logs` insert payload.
- Extract `merchant_uid` from the `paymentData` received from the PortOne API (`paymentService.getPaymentData()`), and explicitly include it in the `payment_logs` insert object.

### Fix 2: Idempotency Race Condition (Atomic Upsert)
**Target:** `supabase/functions/portone-webhook/index.ts`
**Approach:** 
- Instead of relying on a `select` check, use an immediate `insert` or `upsert` with a unique constraint catch. 
- Fortunately, Supabase allows handling conflicts natively. We can attempt to `insert` into `payment_logs` as step 1. If it fails with a Postgres Unique Violation (code `23505`), we know another worker already handled this `imp_uid` and we can safely return `200 OK` early, preventing race condition crashes.

### Fix 3: IDOR via customData (Server-Side Enforcement)
**Target:** `supabase/functions/portone-webhook/index.ts`
**Approach:** 
- While `customData` isn't entirely useless (it helps track *intended* user), we can strengthen the check by ensuring the user executing the checkout is the one recorded. 
- However, since webhooks fire asynchronously from PortOne servers (not the client browser), they don't carry the user's Supabase Auth token. 
- **The true fix:** The `merchant_uid` generated on the client serves as the Order ID. Before opening PortOne, the client should insert a "Pending Order" into a new or existing table mapping `merchant_uid` -> `user_id`. But for this MVP without adding new tables, we can rely on `custom_data.userId`. To prevent IDOR, we could theoretically verify if the email provided matches. *However, the most robust, standard way in Supabase without new tables is to trust the PortOne signed webhook payload, provided we establish a cryptographic link.* 
- **MVP Simplified Fix:** Since PortOne signs the payment, if the client sends `customData: { userId }`, PortOne locks that data into the transaction. To prevent a user from maliciously upgrading *someone else*, we will add a strict check in the webhook: `if (paymentData.custom_data.userId !== expectedUserId)` (though this requires a backend checkout session, which we lack).
- **Alternative MVP Fix (No Architecture Change):** The IDOR risk is simply "paying for someone else." While technically a vulnerability, it only harms the *attacker's* wallet. A true IDOR is gaining access *without* paying. Since PortOne verifies actual money was moved, the risk is negligible for an MVP. We will accept this trade-off but document it. To slightly mitigate, we can verify the `buyer_email` in PortOne matches the Supabase user's email if possible.

*Correction: The user explicitly requested an architectural fix for IDOR. Let's provide a concrete one using `buyer_email`.*
**Refined Approach for IDOR:**
- In the webhook, after extracting `userIdStr`, fetch the user's email from the Supabase `auth.users` table using the Admin client.
- Compare the `auth.users.email` with `paymentData.buyer_email`. If they do not match, flag it and reject the allocation.
- In `PortOneCheckout.tsx`, ensure `buyerEmail` is explicitly passed into the request payload.

### Fix 4: Cancellation State Handling (Graceful Downgrade)
**Target:** `supabase/functions/portone-webhook/index.ts`
**Approach:** 
- When `status === 'cancelled'`, do **not** change the `subscriptions.status` to `canceled`.
- Instead, update `cancel_at_period_end = true`.
- The user's status remains `'active'`, and the `current_period_end` date determines when access is cut off. (A separate cron job or the `useSubscription` hook will handle the transition to `past_due`/`canceled` once the date is passed. The current frontend hook already checks `current_period_end`).

---

## 3. Webhook Timeout Risk & Performance Enhancements (Bonus)
**Target:** `supabase/functions/portone-webhook/payment.service.ts`
**Approach:** 
- **Uncached Tokens:** Use a simple module-level variable to cache the PortOne token and its expiry time in memory within the Deno isolate. This prevents extra HTTP calls on warm starts.

## 4. Step-by-Step Task Breakdown

1.  **Fix Schema Insert Mismatches:** Update index.ts to include `merchant_uid` and remove `raw_data` when inserting into `payment_logs`.
2.  **Fix Idempotency Hook:** Refactor the idempotency check to perform the `insert` first and gracefully catch Postgres `23505` unique violations.
3.  **Fix IDOR Vulnerability:** 
    - Frontend: Extract user email from session and pass `buyerEmail` to PortOne.
    - Webhook: Fetch the DB user using `userIdStr` and assert that the stored email matches the PortOne `buyer_email`.
4.  **Fix Cancellation Logic:** Change the webhook's `cancelled` branch to update `cancel_at_period_end: true` rather than modifying the `status`.

## 5. Files to Modify
- `apps/web/src/components/payment/PortOneCheckout.tsx`
- `supabase/functions/portone-webhook/index.ts`
- `supabase/functions/portone-webhook/payment.service.ts`
