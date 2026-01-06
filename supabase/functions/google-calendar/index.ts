import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: tokens } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (!tokens) {
    throw new Error('Google Calendar not connected. Please connect first.');
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs <= now.getTime()) {
    console.log('[google-calendar] Token expired, refreshing...');
    
    // Refresh the token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: tokenData.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokens.id);

    return tokenData.access_token;
  }

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action, calendarId = 'primary', ...params } = body;

    console.log(`[google-calendar] Action: ${action}`);

    const accessToken = await getValidAccessToken(supabase);

    // List calendars
    if (action === 'list-calendars') {
      const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return new Response(JSON.stringify({ calendars: data.items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List events
    if (action === 'list-events') {
      const { timeMin, timeMax, maxResults = 100 } = params;
      
      const url = new URL(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
      if (timeMin) url.searchParams.set('timeMin', timeMin);
      if (timeMax) url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('maxResults', String(maxResults));
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return new Response(JSON.stringify({ events: data.items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create event
    if (action === 'create-event') {
      const { event } = params;
      
      if (!event) {
        throw new Error('event is required');
      }

      console.log(`[google-calendar] Creating event:`, event.summary);

      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error(`[google-calendar] Create error:`, data.error);
        throw new Error(data.error.message);
      }

      console.log(`[google-calendar] Event created with ID: ${data.id}`);

      return new Response(JSON.stringify({ event: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update event
    if (action === 'update-event') {
      const { eventId, event } = params;
      
      if (!eventId || !event) {
        throw new Error('eventId and event are required');
      }

      console.log(`[google-calendar] Updating event: ${eventId}`);

      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error(`[google-calendar] Update error:`, data.error);
        throw new Error(data.error.message);
      }

      console.log(`[google-calendar] Event updated successfully`);

      return new Response(JSON.stringify({ event: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete event
    if (action === 'delete-event') {
      const { eventId } = params;
      
      if (!eventId) {
        throw new Error('eventId is required');
      }

      console.log(`[google-calendar] Deleting event: ${eventId}`);

      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.status !== 204 && response.status !== 200) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message);
        }
      }

      console.log(`[google-calendar] Event deleted successfully`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get event
    if (action === 'get-event') {
      const { eventId } = params;
      
      if (!eventId) {
        throw new Error('eventId is required');
      }

      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return new Response(JSON.stringify({ event: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error(`[google-calendar] Error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
