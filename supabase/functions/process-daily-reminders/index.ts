import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify authorization. This is expected to be called by pg_cron or an admin.
        // We'll require the Service Role Key for this Cron Job function.
        const authHeader = req.headers.get("Authorization");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!authHeader || authHeader.replace("Bearer ", "") !== supabaseServiceRoleKey) {
            return new Response(JSON.stringify({ error: "Unauthorized. Service role key required." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 1. Fetch pending users via RPC
        const { data: pendingUsers, error: rpcError } = await supabase.rpc("get_pending_training_users");

        if (rpcError) {
            throw new Error(`Failed to fetch pending users: ${rpcError.message}`);
        }

        if (!pendingUsers || pendingUsers.length === 0) {
            return new Response(JSON.stringify({ message: "No pending users found today." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        console.log(`Found ${pendingUsers.length} users needing reminders.`);

        // 2. Dispatch to send-push function asynchronously in chunks
        // To avoid timing out this process-daily-reminders function if there are thousands of users,
        // we map over them and invoke the send-push function.

        const title = "Ready for your daily mission? 🚀";
        const bodyTemplate = "You have {{count}} unlearned words waiting for you in VocaFit!";

        // We use a chunking loop to prevent hitting Deno or Supabase limits.
        const CHUNK_SIZE = 50;
        let successful = 0;
        let failed = 0;

        for (let i = 0; i < pendingUsers.length; i += CHUNK_SIZE) {
            const chunk = pendingUsers.slice(i, i + CHUNK_SIZE);
            const chunkPromises = chunk.map((user: { user_id: string, unlearned_count: number }) => {
                const body = bodyTemplate.replace("{{count}}", user.unlearned_count.toString());
                return supabase.functions.invoke('send-push', {
                    body: { userId: user.user_id, title, body }
                });
            });

            const results = await Promise.allSettled(chunkPromises);
            successful += results.filter(r => r.status === "fulfilled").length;
            failed += results.filter(r => r.status === "rejected").length;

            // Short delay to avoid rate-limiting
            if (i + CHUNK_SIZE < pendingUsers.length) {
                await new Promise(res => setTimeout(res, 200));
            }
        }

        return new Response(JSON.stringify({
            message: "Daily reminders processed",
            total: pendingUsers.length,
            successful,
            failed
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error in process-daily-reminders:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
