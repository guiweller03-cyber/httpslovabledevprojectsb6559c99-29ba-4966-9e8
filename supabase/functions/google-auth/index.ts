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

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`[google-auth] Action: ${action}`);

    if (action === 'get-auth-url') {
      // Generate OAuth URL
      const redirectUri = url.searchParams.get('redirect_uri');
      
      if (!redirectUri) {
        throw new Error('redirect_uri is required');
      }

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      console.log(`[google-auth] Generated auth URL for redirect: ${redirectUri}`);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange-code') {
      // Exchange authorization code for tokens
      const body = await req.json();
      const { code, redirect_uri } = body;

      if (!code || !redirect_uri) {
        throw new Error('code and redirect_uri are required');
      }

      console.log(`[google-auth] Exchanging code for tokens`);

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error(`[google-auth] Token error:`, tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      console.log(`[google-auth] Token exchange successful`);

      // Calculate expiration
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store tokens in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // First, check if tokens already exist
      const { data: existingTokens } = await supabase
        .from('google_calendar_tokens')
        .select('id, refresh_token')
        .limit(1);

      if (existingTokens && existingTokens.length > 0) {
        // Update existing tokens
        const existingToken = existingTokens[0] as { id: string; refresh_token: string };
        const { error: updateError } = await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || existingToken.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);

        if (updateError) {
          console.error(`[google-auth] Error updating tokens:`, updateError);
          throw updateError;
        }
      } else {
        // Insert new tokens
        const { error: insertError } = await supabase
          .from('google_calendar_tokens')
          .insert({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
          });

        if (insertError) {
          console.error(`[google-auth] Error inserting tokens:`, insertError);
          throw insertError;
        }
      }

      console.log(`[google-auth] Tokens stored successfully`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-connection') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: tokens } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .limit(1)
        .maybeSingle();

      const connected = tokens && tokens.access_token && new Date(tokens.expires_at) > new Date();

      return new Response(JSON.stringify({ connected, hasTokens: !!tokens }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'refresh-token') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: tokens } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available');
      }

      console.log(`[google-auth] Refreshing access token`);

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
        console.error(`[google-auth] Refresh error:`, tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: tokenData.access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokens.id);

      console.log(`[google-auth] Token refreshed successfully`);

      return new Response(JSON.stringify({ success: true, access_token: tokenData.access_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error(`[google-auth] Error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
