# Payment System Implementation Tasks

## Phase 1: Frontend Payload Injection
- [x] **Inject User Identity:** In `apps/web/src/components/payment/PortOneCheckout.tsx`, get the active `userId` securely (e.g. from `useSessionStore` or Supabase Auth context) and pass it to the `PortOne.requestPayment` payload inside the `customData` property.

## Phase 2: Database Setup & Sync
- [x] **Verify Payment Tables & Policies:** Ensure `subscriptions` and `payment_logs` tables exist. Verify RLS policies and Service Role access policies. (Can be skipped if already done from previous `portone-payment-tasks.md`, but must double check if tables exist).

## Phase 3: Webhook Edge Function (Core Logic)
- [x] **Scaffold HTTP Endpoint:** Create `supabase/functions/portone-webhook/index.ts` to handle incoming POST requests via `serve`.
- [x] **Implement Idempotency (中複 Webhook 방지):** Query `payment_logs` table by `imp_uid` first. If it exists, return `200 OK` early.
- [x] **Implement Strict Verification (결제 금액 검증):** Connect the existing `PaymentService`. Look up real payment details via PortOne API using the provided `imp_uid`. Verify `amount` strictly equals 4900.
- [x] **Database Upsert (Provisioning):** If verified and `status === 'paid'`, execute Supabase Admin upsert on the `subscriptions` table setting `status` to `active` and extending `current_period_end`. Insert log into `payment_logs`.
- [x] **Handle Failures/Cancelations:** If status is `failed` or `cancelled`, downgrade or handle state appropriately.

## Phase 4: Final QA & Compile Check
- [x] **TypeScript Check:** Run `npx tsc --noEmit`.
- [x] **Lint and Check:** Ensure no new errors are introduced in the payment flow.
