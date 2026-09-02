import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    
    // Verify user identity
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

     const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || (userProfile.role !== "OWNER" && userProfile.role !== "STAFF")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const RequestSchema = z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "model", "system"]),
        parts: z.array(z.object({ text: z.string() }))
      })),
      context: z.any().optional()
    });

    const payload = await req.json();

    const validation = RequestSchema.safeParse(payload);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemInstruction = `
      You are the DinkResponsibly AI Consultant.
      You help manage a pickleball court booking system.
      Available actions you can propose:
      1. update_rate: { court_id: string, new_rate: number, rate_type: 'weekday_day_rate' | 'weekday_night_rate' | 'weekend_rate' }
      2. disable_staff: { staff_id: string }
      3. block_schedule: { court_id: string, date: string, start_hour: number, end_hour: number, reason: string }
      
      Always return your response in pure JSON format matching this schema exactly:
      {
        "text_response": "Your friendly text explanation and analysis",
        "suggested_action": { "type": "action_name", "payload": { ... } } // omit if no action is needed
      }
      
      Context data provided by the client: ${JSON.stringify(validation.data.context || {})}
    `;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: { text: systemInstruction } },
        contents: validation.data.messages,
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const resultText = geminiData.candidates[0].content.parts[0].text;

    return new Response(resultText, { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});