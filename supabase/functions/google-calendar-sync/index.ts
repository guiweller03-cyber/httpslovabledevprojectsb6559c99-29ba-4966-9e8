import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

interface SyncPayload {
  event_id: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  summary?: string;
  description?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    // Read raw body as text first (avoids Deno/Supabase "empty body" issues with req.json())
    const bodyText = await req.text();
    console.log('Corpo recebido:', bodyText);

    const contentType = req.headers.get('content-type');
    const contentLength = req.headers.get('content-length');
    console.log('Request meta:', {
      method: req.method,
      contentType,
      contentLength,
    });

    if (!bodyText || bodyText.trim().length === 0) {
      return jsonResponse(400, {
        error: 'Empty request body',
        details: { contentType, contentLength },
      })
    }

    let payload: SyncPayload;
    try {
      payload = JSON.parse(bodyText) as SyncPayload;
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError);
      return jsonResponse(400, {
        error: 'Invalid JSON body',
        details: String(parseError),
        bodyText,
      })
    }

    console.log('Received sync payload:', payload);

    const { event_id, status, start_date, end_date, summary, description } = payload;

    if (!event_id) {
      return jsonResponse(400, { error: 'event_id is required' })
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let found = false;
    let updatedTable = '';
    let actionTaken = '';

    // Check if event is cancelled
    const isCancelled = status?.toLowerCase() === 'cancelled' || status?.toLowerCase() === 'canceled';

    // Try to find in bath_grooming_appointments first
    const { data: bathAppointment, error: bathError } = await supabase
      .from('bath_grooming_appointments')
      .select('id')
      .eq('google_event_id', event_id)
      .maybeSingle();

    if (bathError) {
      console.error('Error searching bath_grooming_appointments:', bathError);
    }

    if (bathAppointment) {
      found = true;
      updatedTable = 'bath_grooming_appointments';

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (isCancelled) {
        updateData.status = 'cancelado';
        updateData.kanban_status = 'cancelado';
        actionTaken = 'cancelled';
      } else {
        // Update dates if provided
        if (start_date) {
          updateData.start_datetime = start_date;
        }
        if (end_date) {
          updateData.end_datetime = end_date;
        }
        // Update notes from description if provided
        if (description) {
          updateData.notes = description;
        }
        actionTaken = 'updated';
      }

      const { error: updateError } = await supabase
        .from('bath_grooming_appointments')
        .update(updateData)
        .eq('id', bathAppointment.id);

      if (updateError) {
        console.error('Error updating bath_grooming_appointments:', updateError);
        return jsonResponse(500, { error: 'Failed to update appointment', details: updateError.message })
      }

      console.log(`Updated bath_grooming_appointments id=${bathAppointment.id}`, updateData);
    }

    // If not found in bath, try hotel_stays
    if (!found) {
      const { data: hotelStay, error: hotelError } = await supabase
        .from('hotel_stays')
        .select('id')
        .eq('google_event_id', event_id)
        .maybeSingle();

      if (hotelError) {
        console.error('Error searching hotel_stays:', hotelError);
      }

      if (hotelStay) {
        found = true;
        updatedTable = 'hotel_stays';

        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (isCancelled) {
          updateData.status = 'cancelado';
          actionTaken = 'cancelled';
        } else {
          // Update dates if provided
          if (start_date) {
            updateData.check_in = start_date;
          }
          if (end_date) {
            updateData.check_out = end_date;
          }
          // Update notes from description if provided
          if (description) {
            updateData.notes = description;
          }
          actionTaken = 'updated';
        }

        const { error: updateError } = await supabase
          .from('hotel_stays')
          .update(updateData)
          .eq('id', hotelStay.id);

        if (updateError) {
          console.error('Error updating hotel_stays:', updateError);
          return jsonResponse(500, { error: 'Failed to update hotel stay', details: updateError.message })
        }

        console.log(`Updated hotel_stays id=${hotelStay.id}`, updateData);
      }
    }

    // If not found in either table, try to create a new appointment
    if (!found && !isCancelled) {
      console.log('Event not found, attempting to create new appointment...');

      // Extract pet name from summary (e.g., "Banho - Rex" or just "Rex")
      const petName = summary?.replace(/^(Banho|Tosa|Hotel|Creche)\s*[-–]\s*/i, '').trim();

      if (!petName) {
        console.log('No pet name found in summary');
        return jsonResponse(400, {
          success: false,
          message: 'Cannot create appointment: no pet name in summary',
          event_id,
        })
      }

      // Try to find a pet by name (case-insensitive)
      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select('id, client_id, name, size, coat_type')
        .ilike('name', petName);

      if (petsError) {
        console.error('Error searching pets:', petsError);
        return jsonResponse(500, { error: 'Failed to search pets', details: petsError.message })
      }

      if (!pets || pets.length === 0) {
        console.log(`No pet found with name: ${petName}`);
        return jsonResponse(404, {
          success: false,
          message: `Pet not found: ${petName}`,
          event_id,
        })
      }

      // Use the first matching pet
      const pet = pets[0];
      console.log(`Found pet: ${pet.name} (id: ${pet.id})`);

      // Determine service type from summary
      const summaryLower = summary?.toLowerCase() || '';
      const isHotel = summaryLower.includes('hotel') || summaryLower.includes('creche');
      const isTosa = summaryLower.includes('tosa');
      const isBanho = summaryLower.includes('banho');

      // Parse dates
      const startDateTime = start_date ? new Date(start_date) : new Date();
      const endDateTime = end_date ? new Date(end_date) : new Date(startDateTime.getTime() + 60 * 60 * 1000);

      if (isHotel) {
        // Create hotel stay
        const { data: newStay, error: createError } = await supabase
          .from('hotel_stays')
          .insert({
            client_id: pet.client_id,
            pet_id: pet.id,
            google_event_id: event_id,
            check_in: startDateTime.toISOString(),
            check_out: endDateTime.toISOString(),
            daily_rate: 0, // Will need to be set manually
            total_price: 0,
            status: 'reservado',
            is_creche: summaryLower.includes('creche'),
            notes: description || `Criado via Google Calendar: ${summary}`,
            payment_status: 'pendente',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating hotel stay:', createError);
          return jsonResponse(500, { error: 'Failed to create hotel stay', details: createError.message })
        }

        console.log('Created new hotel stay:', newStay.id);
        found = true;
        updatedTable = 'hotel_stays';
        actionTaken = 'created';
      } else {
        // Create bath/grooming appointment
        let serviceType = 'banho';
        if (isTosa && isBanho) {
          serviceType = 'banho_e_tosa';
        } else if (isTosa) {
          serviceType = 'tosa';
        }

        const { data: newAppointment, error: createError } = await supabase
          .from('bath_grooming_appointments')
          .insert({
            client_id: pet.client_id,
            pet_id: pet.id,
            google_event_id: event_id,
            start_datetime: startDateTime.toISOString(),
            end_datetime: endDateTime.toISOString(),
            service_type: serviceType,
            status: 'agendado',
            kanban_status: 'espera',
            notes: description || `Criado via Google Calendar: ${summary}`,
            payment_status: 'pendente',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating appointment:', createError);
          return jsonResponse(500, { error: 'Failed to create appointment', details: createError.message })
        }

        console.log('Created new appointment:', newAppointment.id);
        found = true;
        updatedTable = 'bath_grooming_appointments';
        actionTaken = 'created';
      }
    }

    if (!found && isCancelled) {
      console.log(`Event ${event_id} not found, but status is cancelled - nothing to do`);
      return jsonResponse(200, {
        success: true,
        message: 'Event not found but already cancelled - no action needed',
        event_id,
      })
    }

    if (!found) {
      console.log(`No record found for event_id: ${event_id}`);
      return jsonResponse(404, {
        success: false,
        message: 'Event not found in any table and could not be created',
        event_id,
      })
    }

    return jsonResponse(200, {
      success: true,
      message: `Appointment ${actionTaken}`,
      action: actionTaken,
      table: updatedTable,
      event_id,
    })

  } catch (error) {
    console.error('Error processing request:', error);
    return jsonResponse(500, { error: 'Internal server error', details: String(error) })
  }
});
