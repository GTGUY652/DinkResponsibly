import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SENDER_EMAIL = "onboarding@resend.dev"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendResendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `DinkResponsibly <${SENDER_EMAIL}>`,
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API Error: ${errorText}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // ---------------------------------------------------------
    // FLOW 1: BOOKING CONFIRMATION (Triggered by Database Webhook)
    // ---------------------------------------------------------
    if (payload.type === "INSERT" && payload.table === "bookings") {
      const bookingId = payload.record.id;
      
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("*, courts(name)")
        .eq("id", bookingId)
        .single();
        
      if (fetchError || !booking) throw new Error("Failed to fetch booking details");
      
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0c10; padding: 40px 20px; color: #f3f4f6; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #121820; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            
            <!-- Header -->
            <div style="background-color: #4ade80; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #0a0c10; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">DINK RESPONSIBLY</h1>
              <p style="margin: 5px 0 0 0; color: #0a0c10; font-size: 14px; opacity: 0.9;">Court Reservation Confirmed</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 32px; background-color: #121820;">
              <p style="font-size: 16px; margin-top: 0;">Hi <strong>${booking.guest_name}</strong>,</p>
              <p style="font-size: 15px; color: #9ca3af;">Thank you for booking with us. Your reservation details have been received and are pending staff verification.</p>
              
              <div style="background-color: #1a222d; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #2d3748;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
                <p style="margin: 0 0 20px 0; font-size: 28px; font-weight: bold; color: #4ade80; letter-spacing: 2px;">${booking.booking_code}</p>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #2d3748; color: #9ca3af;">Court</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #2d3748; text-align: right; font-weight: 600;">${booking.courts?.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #2d3748; color: #9ca3af;">Date</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #2d3748; text-align: right; font-weight: 600;">${booking.booking_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #2d3748; color: #9ca3af;">Time</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #2d3748; text-align: right; font-weight: 600;">${booking.start_hour}:00 - ${booking.end_hour}:00</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9ca3af;">Total Paid</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #4ade80;">₱${booking.total_price}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; color: #9ca3af; margin-bottom: 10px;">Payment Reference ending in: <strong>${booking.payment_reference_last4}</strong></p>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Your Attached Receipt</p>
                <img src="${booking.receipt_url}" alt="Payment Receipt" style="max-width: 100%; border-radius: 8px; border: 2px solid #2d3748;" />
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="padding: 20px; text-align: center; background-color: #0d1117; border-top: 1px solid #1f2937;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">Need help? Reply to this email or send us a ticket via our website.</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #4b5563;">&copy; ${new Date().getFullYear()} DinkResponsibly. All rights reserved.</p>
            </div>
            
          </div>
        </div>
      `;
      
      try {
        await sendResendEmail(booking.guest_email, `Booking Confirmed: ${booking.booking_code}`, htmlBody);
        
        await supabase.from("email_logs").insert({
          recipient_email: booking.guest_email,
          email_type: "booking",
          status: "sent",
          booking_id: bookingId
        });
        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (emailError: any) {
        await supabase.from("email_logs").insert({
          recipient_email: booking.guest_email,
          email_type: "booking",
          status: "failed",
          error_message: emailError.message,
          booking_id: bookingId
        });
        return new Response(JSON.stringify({ error: "Email dispatch failed but logged silently" }), { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }
    
    // ---------------------------------------------------------
    // FLOW 2: SUPPORT TICKET REPLY (Triggered by Client API Call)
    // ---------------------------------------------------------
    if (payload.action === "ticket_reply") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing Authorization header");
      
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
      
      const { ticket_id, admin_reply_message } = payload;
      
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticket_id)
        .single();
        
      if (ticketError || !ticket) throw new Error("Ticket not found");
      
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0c10; padding: 40px 20px; color: #f3f4f6; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #121820; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            
            <!-- Header -->
            <div style="background-color: #4ade80; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #0a0c10; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">DINK RESPONSIBLY</h1>
              <p style="margin: 5px 0 0 0; color: #0a0c10; font-size: 14px; opacity: 0.9;">Support Ticket Update</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 32px; background-color: #121820;">
              <p style="font-size: 16px; margin-top: 0;">Hi <strong>${ticket.guest_name}</strong>,</p>
              <p style="font-size: 15px; color: #9ca3af;">We have an update regarding your support ticket (<span style="color: #4ade80; font-weight: bold;">${ticket.ticket_reference}</span>):</p>
              
              <!-- Reply Box -->
              <div style="background-color: #1a222d; border-radius: 8px; padding: 24px; margin: 25px 0; border-left: 4px solid #4ade80;">
                <p style="margin: 0; font-size: 16px; color: #f3f4f6; white-space: pre-wrap;">${admin_reply_message}</p>
              </div>
              
              <p style="font-size: 15px; color: #9ca3af; margin-top: 30px;">Best regards,<br/><strong style="color: #f3f4f6;">DinkResponsibly Support Team</strong></p>
            </div>
            
            <!-- Footer -->
            <div style="padding: 20px; text-align: center; background-color: #0d1117; border-top: 1px solid #1f2937;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">You received this email because you submitted a ticket on our website.</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #4b5563;">&copy; ${new Date().getFullYear()} DinkResponsibly. All rights reserved.</p>
            </div>
            
          </div>
        </div>
      `;
      
      try {
        await sendResendEmail(ticket.guest_email, `Update on your Ticket: ${ticket.ticket_reference}`, htmlBody);
        
        await supabase.from("support_tickets").update({
          status: "RESOLVED",
          admin_reply: admin_reply_message,
          replied_by: user.id,
          replied_at: new Date().toISOString()
        }).eq("id", ticket_id);
        
        await supabase.from("email_logs").insert({
          recipient_email: ticket.guest_email,
          email_type: "ticket",
          status: "sent",
          ticket_id: ticket_id
        });
        
        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (emailError: any) {
        await supabase.from("email_logs").insert({
          recipient_email: ticket.guest_email,
          email_type: "ticket",
          status: "failed",
          error_message: emailError.message,
          ticket_id: ticket_id
        });
        return new Response(JSON.stringify({ error: emailError.message }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }
    
    return new Response(JSON.stringify({ error: "Unknown payload" }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});