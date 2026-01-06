import { useEffect, useState } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Link, Loader2, Unlink, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function GoogleCalendarStatus() {
  const { isConnected, isLoading, checkConnection, connect, createEvent } = useGoogleCalendar();
  const [checking, setChecking] = useState(true);
  const [testingEvent, setTestingEvent] = useState(false);
  const [eventCreated, setEventCreated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      await checkConnection();
      setChecking(false);
    };
    check();
  }, [checkConnection]);

  const handleTestEvent = async () => {
    setTestingEvent(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora a partir de agora
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min de duração

      const event = await createEvent({
        summary: '🐾 Teste PetSaaS - Conexão OK!',
        description: 'Este evento foi criado automaticamente para testar a integração do PetSaaS com o Google Calendar.',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
      });

      if (event) {
        setEventCreated(true);
        toast({
          title: '✅ Evento Criado!',
          description: 'Verifique seu Google Calendar - o evento de teste aparecerá em 1 hora.',
        });
      }
    } catch (error) {
      console.error('Erro ao criar evento de teste:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o evento de teste.',
        variant: 'destructive',
      });
    } finally {
      setTestingEvent(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Calendar className="h-5 w-5 text-primary" />
      
      {isConnected ? (
        <>
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <Link className="h-3 w-3 mr-1" />
            Google Calendar Conectado
          </Badge>
          
          {!eventCreated ? (
            <Button 
              onClick={handleTestEvent} 
              size="sm" 
              variant="outline"
              disabled={testingEvent}
            >
              {testingEvent ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Criar Evento de Teste
            </Button>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Evento criado com sucesso!
            </Badge>
          )}
        </>
      ) : (
        <>
          <Badge variant="secondary">
            <Unlink className="h-3 w-3 mr-1" />
            Não Conectado
          </Badge>
          <Button 
            onClick={connect} 
            size="sm" 
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Conectar Google Calendar
          </Button>
        </>
      )}
    </div>
  );
}