import { useEffect, useState } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Link, Loader2, Unlink } from 'lucide-react';

export function GoogleCalendarStatus() {
  const { isConnected, isLoading, checkConnection, connect } = useGoogleCalendar();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      await checkConnection();
      setChecking(false);
    };
    check();
  }, [checkConnection]);

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Calendar className="h-5 w-5 text-primary" />
      
      {isConnected ? (
        <>
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <Link className="h-3 w-3 mr-1" />
            Google Calendar Conectado
          </Badge>
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
