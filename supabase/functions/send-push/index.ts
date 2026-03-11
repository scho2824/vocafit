import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { initializeApp, cert, getApps } from "npm:firebase-admin@11.11.1/app";
import { getMessaging } from "npm:firebase-admin@11.11.1/messaging";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Firebase Admin (Only once per cold start)
if (getApps().length === 0) {
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (serviceAccountStr) {
        try {
            const serviceAccount = JSON.parse(serviceAccountStr);
            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log("Firebase Admin initialized.");
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
        }
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT is missing. Notifications will fail.");
    }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Admin Client
        // We use the Service Role key because this function is called either
        // by another Edge Function or internally, and needs to bypass RLS to read tokens.
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        const authHeader = req.headers.get("Authorization");
        // Simple security: The invoker must pass the service role key or a valid user token
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "No authorization header" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const isServiceRole = token === supabaseServiceRoleKey;

        const { userId, title, body } = await req.json();

        if (!userId || !title || !body) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const supabase = createClient(supabaseUrl, token);

        if (!isServiceRole) {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return new Response(JSON.stringify({ error: "Unauthorized. Invalid JWT." }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 401,
                });
            }
            if (user.id !== userId) {
                return new Response(JSON.stringify({ error: "Forbidden. You can only send pushes to yourself." }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 403,
                });
            }
        }

        const dbClient = isServiceRole ? createClient(supabaseUrl, supabaseServiceRoleKey) : supabase;

        // 2. Fetch User Tokens
        const { data: tokens, error: tokenError } = await dbClient
            .from("user_push_tokens")
            .select("token, platform")
            .eq("user_id", userId);

        if (tokenError) {
            throw new Error(`Failed to fetch tokens: ${tokenError.message}`);
        }

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: "No tokens found for user" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 3. Send Push Notifications via FCM
        const messaging = getMessaging();
        const sendPromises = tokens.map(async (t: { token: string, platform: string }) => {
            try {
                const message = {
                    notification: { title, body },
                    token: t.token,
                };
                const response = await messaging.send(message);
                return { token: t.token, success: true, response };
            } catch (error: any) {
                console.error(`Error sending to token ${t.token}:`, error);

                // 4. Handle Stale Tokens (Clean up 'NotRegistered' or equivalent errors)
                // FCM error codes often include 'messaging/registration-token-not-registered'
                // or 'messaging/invalid-registration-token'
                if (
                    error?.code === "messaging/registration-token-not-registered" ||
                    error?.code === "messaging/invalid-registration-token"
                ) {
                    await dbClient
                        .from("user_push_tokens")
                        .delete()
                        .eq("token", t.token);
                    console.log(`Deleted stale token: ${t.token}`);
                }
                return { token: t.token, success: false, error: error?.message };
            }
        });

        const results = await Promise.all(sendPromises);

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error in send-push function:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
