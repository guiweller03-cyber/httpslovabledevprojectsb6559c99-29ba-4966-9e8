import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  colorId?: string;
  location?: string;
}

interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
}

export function useGoogleCalendar() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-auth', {
        body: {},
        headers: {},
      });

      // Use query param approach
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=check-connection`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.error) {
        setIsConnected(false);
        return false;
      }

      setIsConnected(result.connected);
      return result.connected;
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Get OAuth URL
  const getAuthUrl = useCallback(async (redirectUri: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=get-auth-url&redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      throw error;
    }
  }, []);

  // Exchange code for tokens
  const exchangeCode = useCallback(async (code: string, redirectUri: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?action=exchange-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setIsConnected(true);
      toast({
        title: '✅ Google Calendar Conectado!',
        description: 'Sua conta Google foi conectada com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error exchanging code:', error);
      toast({
        title: 'Erro na Conexão',
        description: error instanceof Error ? error.message : 'Erro ao conectar Google Calendar',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // List calendars
  const listCalendars = useCallback(async (): Promise<CalendarInfo[]> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'list-calendars' }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.calendars || [];
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }, []);

  // List events
  const listEvents = useCallback(async (
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string
  ) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'list-events',
            calendarId,
            timeMin,
            timeMax,
          }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.events || [];
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }, []);

  // Create event
  const createEvent = useCallback(async (
    event: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent | null> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'create-event',
            calendarId,
            event,
          }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.event;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Erro ao Criar Evento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Update event
  const updateEvent = useCallback(async (
    eventId: string,
    event: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent | null> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'update-event',
            calendarId,
            eventId,
            event,
          }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.event;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Erro ao Atualizar Evento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Delete event
  const deleteEvent = useCallback(async (
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'delete-event',
            calendarId,
            eventId,
          }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Erro ao Excluir Evento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Connect Google account
  const connect = useCallback(async () => {
    try {
      const redirectUri = `${window.location.origin}/google-callback`;
      const authUrl = await getAuthUrl(redirectUri);
      
      // Open OAuth popup
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating connection:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar conexão com Google',
        variant: 'destructive',
      });
    }
  }, [getAuthUrl, toast]);

  return {
    isConnected,
    isLoading,
    checkConnection,
    connect,
    exchangeCode,
    listCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
