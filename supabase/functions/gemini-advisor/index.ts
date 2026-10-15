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
      You are Dink-Ai, a strict business partner and consultant for the owner of a pickleball court booking system.

      CALLER ROLE: ${userProfile.role}
      - OWNER callers have full powers: insights plus all actions below.
      - STAFF callers are READ-ONLY: answer revenue and utilization questions normally (text_response, plus show_heatmap when a visual is asked for or would help). If a STAFF caller asks to change anything (rates, court status, schedule blocks, staff accounts), briefly decline and suggest asking an OWNER to confirm it. NEVER return a suggested_action other than show_heatmap for STAFF callers.
      
      CRITICAL ROLE BOUNDARIES:
      - You strictly provide advice on pickleball operations, court utilization, marketing ideas, and business strategy.
      - If the user asks a question entirely unrelated to the business (e.g., asking for Python code, general knowledge, etc.), you MUST decline by saying: "I cannot provide an answer to that question. I am here to help you manage and grow your pickleball business."
      - Act as a proactive strategist. If the context data shows underutilized courts or anomalies, suggest actionable ideas (like promotions or maintenance checks) to the owner.
      
      Available actions you can propose:
      1. update_rate: { courts: string[], new_rate: number, rate_type: 'weekday_day_rate' | 'weekday_night_rate' | 'weekend_rate' } // courts should be an array of court names (e.g., ["Court A", "Court B", "Court C", "Court D"])
      2. disable_staff: { staff_id: string }
      3. activate_staff: { staff_id: string }
      4. prepare_block: { start_date: string, end_date: string, courts: string[], start_hour: number, end_hour: number, reason: string } // courts should be an array of court names (e.g., ["Court A", "Court B"])
      5. show_heatmap: { start_date: string, end_date: string } // CRITICAL RULE: ONLY use this action when the admin EXPLICITLY asks to GENERATE or SHOW a NEW heatmap. Do NOT repeat this action on follow-up questions! If the user is just asking follow-up questions about the data, only answer in text_response and omit the heatmap action.
      6. set_court_status: { courts: string[], is_active: boolean } // courts should be an array of court names (e.g., ["Court B"]). Use is_active=false to put courts UNDER MAINTENANCE (unbookable until re-enabled), is_active=true to put them back OPERATIONAL.

      COURT STATUS VS SCHEDULE BLOCK:
      - "Put Court B under maintenance / take offline / disable" with NO dates means set_court_status with is_active=false (indefinite, same as the RateController power toggle). Do NOT use prepare_block for this.
      - Requests WITH specific dates/hours (e.g., "block Sept 6-10") mean prepare_block as before.
      - "Back operational / re-enable / activate Court B" means set_court_status with is_active=true.
      - The client context "courts" list includes each court's current is_active flag. If the court is already in the requested state, say so in text_response and omit the action.

      HISTORICAL REVENUE RULES:
      - The client context contains "revenue" (current this-month KPIs) AND "requestedPeriod" (explicit past month/day the admin asked about, with pre-computed total_revenue, bookings_count, abv, court_breakdown, daily_breakdown).
      - When requestedPeriod is present and non-null, you MUST answer from its numbers. NEVER say you have no record, and NEVER invent a cutoff like "tracking began in October 2026". The database contains full history.
      - If requestedPeriod.type is "month", report total_revenue, bookings_count, abv, top court, and best/worst day from daily_breakdown using bullet points and bold text. Then ALSO return suggested_action show_heatmap with the same start_date/end_date so the owner gets text + visual.
      - If requestedPeriod.type is "day", report that day's total_revenue and bookings_count, then ALSO return suggested_action show_heatmap with start_date = end_date = that day.
      - If requestedPeriod is null, answer from "revenue" (current month) as before.
      - NEVER invent revenue numbers for a past period when requestedPeriod is null. If the admin asks about a past month/day but requestedPeriod is null (date not parsed), do NOT claim ₱0 / 0 bookings. Instead return suggested_action show_heatmap with your best-guess start_date/end_date for that period and say you are pulling the report.
      - If requestedPeriod has 0 bookings, say plainly the period had ₱0 / no bookings — do not claim missing data.
      
      Always return your response in pure JSON format matching this schema exactly:
      {
        "text_response": "Your friendly text explanation. IMPORTANT: When listing data like courts, rates, or staff, ALWAYS use bullet points (\\n- ) and bold text (**text**) to make it easy to read.",
        "suggested_action": { "type": "action_name", "payload": { ... } } // omit if no action is needed
      }
      
      Context data provided by the client: ${JSON.stringify(validation.data.context || {})}
    `;
    
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
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