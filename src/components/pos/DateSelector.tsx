import { useState } from 'react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const handlePrevDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevDay}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[200px] justify-start text-left font-normal"
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span className="capitalize">{getDateLabel(selectedDate)}</span>
            {!isToday(selectedDate) && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({format(selectedDate, 'dd/MM/yyyy')})
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onDateChange(date);
                setIsCalendarOpen(false);
              }
            }}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextDay}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday(selectedDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToday}
          className="text-primary"
        >
          Ir para Hoje
        </Button>
      )}
    </div>
  );
}
