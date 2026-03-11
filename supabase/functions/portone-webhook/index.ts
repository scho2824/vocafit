import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { PaymentService, WebhookPayload } from "./payment.service.ts"

serve(async (req) => {
    // PortOne Webhooks usually expect a 200 OK fast.
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    try {
        const payload: WebhookPayload = await req.json()
        const { imp_uid, status } = payload

        console.log(`[Webhook] Received PortOne event for imp_uid: ${imp_uid}, status: ${status}`)

        // 1. Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            console.error('Missing Supabase environment variables');
            return new Response('Internal Server Error', { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)


        // 3. Verify Payment with PortOne (Security against Tampering)
        const paymentService = new PaymentService()
        const accessToken = await paymentService.getAccessToken()
        const paymentData = await paymentService.getPaymentData(imp_uid, accessToken)

        // Compare expected amount (e.g. 4900) to actual paid amount to prevent fraud
        // In a real app we'd fetch this dynamically per plan, but MVP is fixed at 4900.
        const expectedAmount = 4900;

        if (paymentData.amount !== expectedAmount) {
            console.error(`[Webhook] Security Violation: Amount mismatch. Expected ${expectedAmount}, got ${paymentData.amount}`)
            // Record the malicious attempt
            // Needs user_id (even a dummy if missing) but schema requires valid user_id. We'll extract first.
        }

        // Must extract User ID. In our frontend `PortOneCheckout`, we stashed this in custom_data.
        let userIdStr = '';
        if (paymentData.custom_data) {
            try {
                const customDataPayload = typeof paymentData.custom_data === 'string' ? JSON.parse(paymentData.custom_data) : paymentData.custom_data;
                userIdStr = customDataPayload.userId;
            } catch (e) {
                console.error('[Webhook] Failed to parse custom_data:', e);
                return new Response('Invalid custom_data format', { status: 400 });
            }
        }

        if (!userIdStr && paymentData.customer_uid) {
            // Backup extraction method
            userIdStr = paymentData.customer_uid;
        }

        if (!userIdStr) {
            console.error(`[Webhook] Missing user identification in payment data for imp_uid: ${imp_uid}`);
            return new Response('Missing User ID', { status: 400 })
        }

        // --- IDOR Protection: Cross-Check Email ---
        if (paymentData.status === 'paid') {
            const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userIdStr);
            if (userError || !user) {
                console.error(`[Webhook] User not found for ID: ${userIdStr}`, userError);
                return new Response('User Not Found', { status: 400 });
            }

            if (user.email !== paymentData.buyer_email) {
                console.error(`[Webhook] Security Violation (IDOR): Email mismatch. DB: ${user.email}, PortOne: ${paymentData.buyer_email}`);
                await supabaseAdmin.from('payment_logs').insert({
                    user_id: userIdStr,
                    imp_uid,
                    merchant_uid: paymentData.merchant_uid,
                    status: 'fraud_detected_idor',
                    amount: paymentData.amount
                });
                return new Response('Email Mismatch', { status: 400 });
            }
        }
        // -------------------------------------------

        if (paymentData.amount !== expectedAmount && paymentData.status === 'paid') {
            await supabaseAdmin.from('payment_logs').insert({
                user_id: userIdStr,
                imp_uid,
                merchant_uid: paymentData.merchant_uid,
                status: 'fraud_detected',
                amount: paymentData.amount
            });
            return new Response('Amount Mismatch', { status: 400 })
        }

        // 3. Check Idempotency via Atomic Insert
        const { error: logInsertError } = await supabaseAdmin.from('payment_logs').insert({
            user_id: userIdStr,
            imp_uid,
            merchant_uid: paymentData.merchant_uid,
            status: paymentData.status === 'paid' && status === 'paid' ? 'paid' : status,
            amount: paymentData.amount || 0
        });

        if (logInsertError) {
            if (logInsertError.code === '23505') {
                console.log(`[Webhook] Idempotency: Webhook for imp_uid ${imp_uid} already processed (Unique Constraint). Ignoring.`);
                return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
            }
            console.error('[Webhook] Failed to insert payment_log:', logInsertError);
            return new Response('Database Error', { status: 500 });
        }

        // 4. Update Database
        if (status === 'paid' && paymentData.status === 'paid') {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            // Upsert Subscription
            const { error: subError } = await supabaseAdmin
                .from('subscriptions')
                .upsert({
                    user_id: userIdStr,
                    status: 'active',
                    plan_type: 'premium_monthly',
                    current_period_end: nextMonth.toISOString()
                }, { onConflict: 'user_id' });

            if (subError) {
                console.error('[Webhook] Failed to upsert subscription:', subError)
                return new Response('Failed to update subscription', { status: 500 })
            }

            console.log(`[Webhook] Subscription activated for user: ${userIdStr}`);

        } else if (status === 'cancelled' || status === 'failed') {
            const updatePayload: any = {};
            if (status === 'cancelled') {
                updatePayload.cancel_at_period_end = true;
                // We don't change status to 'canceled' immediately. It remains 'active' until current_period_end.
            } else {
                updatePayload.status = 'past_due';
            }

            // Downgrade existing subscription if exists
            await supabaseAdmin
                .from('subscriptions')
                .update(updatePayload)
                .eq('user_id', userIdStr);

            console.log(`[Webhook] Subscription downgraded/failed for user: ${userIdStr}`);
        }

        // Acknowledge receipt to PortOne
        return new Response('OK', { status: 200 })

    } catch (error: any) {
        console.error('[Webhook] Uncaught error:', error.message)
        return new Response('Internal Server Error', { status: 500 })
    }
})
