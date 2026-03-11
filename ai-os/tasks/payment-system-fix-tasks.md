# Payment System Fix Tasks

## Phase 1: Fix Database Insert Schema Mismatch
- [ ] **Fix `payment_logs` Insert:** In `supabase/functions/portone-webhook/index.ts`, locate the `payment_logs` `insert` statements.
- [ ] **Add `merchant_uid`:** Extract `merchant_uid` from the PortOne API response (`paymentData.merchant_uid` or payload) and add it to the insert object.
- [ ] **Remove `raw_data`:** Remove the `raw_data` property from the insert object as it does not exist in the database schema.

## Phase 2: Fix Idempotency Race Condition
- [ ] **Implement Atomic Insert:** In `supabase/functions/portone-webhook/index.ts`, replace the `select` -> `if (existing)` check with a direct `insert` attempt into `payment_logs`.
- [ ] **Handle Unique Constraint Violation:** Wrap the `insert` in a `try...catch` or check the Supabase `error.code`. If the error is a Postgres Unique Violation (`23505`), it means the webhook was already processed. Return `200 OK` early.

## Phase 3: Fix IDOR Security Vulnerability
- [x] **Frontend `buyerEmail` Injection:** In `apps/web/src/components/payment/PortOneCheckout.tsx`, fetch the user's email from the Supabase session (`session.user.email`) and pass it to `PortOne.requestPayment` inside the `customer` object as `email` (so PortOne registers it as `buyer_email`).
- [x] **Webhook Email Cross-check:** In `supabase/functions/portone-webhook/index.ts`, after extracting `userIdStr`, use the Supabase Admin client to fetch the user's email from the `auth.users` table (`supabaseAdmin.auth.admin.getUserById(userIdStr)`).
- [x] **Reject Mismatches:** Assert that the fetched Supabase email exactly matches `paymentData.buyer_email`. If not, log a security violation and return `400 Bad Request`.

## Phase 4: Fix Cancellation & Edge Cases
- [x] **Graceful Cancellation Downgrade:** In the `cancelled` or `failed` branch of `supabase/functions/portone-webhook/index.ts`, instead of `update({ status: 'canceled' })`, update the subscription with `cancel_at_period_end: true` (if it was a cancellation) and leave `status` unchanged if they still have time left. (If `failed` due to billing, `past_due` is still appropriate, but ensure logic is robust).
- [x] **Safe JSON Parsing:** Wrap the `customData` payload parsing in a stricter try/catch block that doesn't silently swallow critical errors without fallback handling.

## Phase 5: Verification & Compilation
- [x] **TypeScript Check:** Run `npx tsc --noEmit` in `apps/web` to ensure checkout component types are correct.
- [x] **Code Review:** Verify the Edge Function's logic safely handles Deno edge cases.
