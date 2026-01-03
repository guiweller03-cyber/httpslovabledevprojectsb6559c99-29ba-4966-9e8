import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export type ServiceFilter = 'all' | 'grooming' | 'hotel';

interface MonthlyStats {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  total: number;
}

interface TodayReservation {
  id: string;
  type: 'grooming' | 'hotel';
  clientId: string;
  clientName: string;
  petId: string;
  petName: string;
  service: string;
  status: string;
  price: number;
  scheduledAt: string;
}

interface DashboardData {
  // Monthly stats
  monthlyGrooming: MonthlyStats;
  monthlyHotel: MonthlyStats;
  monthlyTotal: MonthlyStats;
  
  // Revenue
  forecastRevenue: {
    grooming: number;
    hotel: number;
    total: number;
  };
  completedRevenue: {
    grooming: number;
    hotel: number;
    total: number;
  };
  
  // Today's reservations (excluding cancelled)
  todayReservations: TodayReservation[];
  
  // Loading state
  isLoading: boolean;
}

export function useDashboardData(filter: ServiceFilter = 'all') {
  const [data, setData] = useState<DashboardData>({
    monthlyGrooming: { scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 },
    monthlyHotel: { scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 },
    monthlyTotal: { scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 },
    forecastRevenue: { grooming: 0, hotel: 0, total: 0 },
    completedRevenue: { grooming: 0, hotel: 0, total: 0 },
    todayReservations: [],
    isLoading: true,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Fetch all data in parallel
      const [
        { data: groomingData },
        { data: hotelData },
        { data: clients },
        { data: pets }
      ] = await Promise.all([
        supabase
          .from('bath_grooming_appointments')
          .select('*')
          .gte('start_datetime', monthStart.toISOString())
          .lte('start_datetime', monthEnd.toISOString()),
        supabase
          .from('hotel_stays')
          .select('*'),
        supabase.from('clients').select('id, name'),
        supabase.from('pets').select('id, name')
      ]);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      const petMap = new Map(pets?.map(p => [p.id, p.name]) || []);

      // Process grooming stats for the month (excluding cancelled from active counts)
      const groomingScheduled = groomingData?.filter(apt => apt.status === 'agendado').length || 0;
      const groomingInProgress = groomingData?.filter(apt => apt.status === 'em_atendimento').length || 0;
      const groomingCompleted = groomingData?.filter(apt => apt.status === 'finalizado').length || 0;
      const groomingCancelled = groomingData?.filter(apt => apt.status === 'cancelado').length || 0;
      const groomingTotal = (groomingData?.filter(apt => apt.status !== 'cancelado').length || 0);

      const monthlyGrooming: MonthlyStats = {
        scheduled: groomingScheduled,
        inProgress: groomingInProgress,
        completed: groomingCompleted,
        cancelled: groomingCancelled,
        total: groomingTotal,
      };

      // Process hotel stats for the month
      const monthlyHotelData = hotelData?.filter(stay => {
        const checkIn = new Date(stay.check_in);
        return isWithinInterval(checkIn, { start: monthStart, end: monthEnd });
      }) || [];

      const hotelReserved = monthlyHotelData.filter(stay => stay.status === 'reservado').length;
      const hotelHosted = monthlyHotelData.filter(stay => stay.status === 'hospedado').length;
      const hotelCompleted = monthlyHotelData.filter(stay => stay.status === 'check_out_realizado').length;
      const hotelCancelled = monthlyHotelData.filter(stay => stay.status === 'cancelado').length;
      const hotelTotal = monthlyHotelData.filter(stay => stay.status !== 'cancelado').length;

      const monthlyHotel: MonthlyStats = {
        scheduled: hotelReserved + hotelHosted,
        inProgress: hotelHosted,
        completed: hotelCompleted,
        cancelled: hotelCancelled,
        total: hotelTotal,
      };

      // Combined monthly totals
      const monthlyTotal: MonthlyStats = {
        scheduled: monthlyGrooming.scheduled + monthlyHotel.scheduled,
        inProgress: monthlyGrooming.inProgress + monthlyHotel.inProgress,
        completed: monthlyGrooming.completed + monthlyHotel.completed,
        cancelled: monthlyGrooming.cancelled + monthlyHotel.cancelled,
        total: monthlyGrooming.total + monthlyHotel.total,
      };

      // Calculate forecast revenue (only agendado + em_atendimento, exclude cancelled)
      const groomingForecast = groomingData
        ?.filter(apt => apt.status === 'agendado' || apt.status === 'em_atendimento')
        .reduce((sum, apt) => sum + (apt.price || 0), 0) || 0;

      const hotelForecast = monthlyHotelData
        .filter(stay => stay.status === 'reservado' || stay.status === 'hospedado')
        .reduce((sum, stay) => sum + (stay.total_price || 0), 0);

      // Calculate completed revenue (only finalizado)
      const groomingCompletedRevenue = groomingData
        ?.filter(apt => apt.status === 'finalizado')
        .reduce((sum, apt) => sum + (apt.price || 0), 0) || 0;

      const hotelCompletedRevenue = monthlyHotelData
        .filter(stay => stay.status === 'check_out_realizado')
        .reduce((sum, stay) => sum + (stay.total_price || 0), 0);

      // Get today's reservations (excluding cancelled)
      const todayGrooming = groomingData?.filter(apt => {
        const aptDate = new Date(apt.start_datetime);
        return isWithinInterval(aptDate, { start: todayStart, end: todayEnd }) && apt.status !== 'cancelado';
      }) || [];

      const todayHotel = hotelData?.filter(stay => {
        const checkIn = new Date(stay.check_in);
        const checkOut = new Date(stay.check_out);
        const isActiveToday = 
          (isWithinInterval(todayStart, { start: new Date(stay.check_in), end: new Date(stay.check_out) }) ||
           isWithinInterval(checkIn, { start: todayStart, end: todayEnd })) &&
          stay.status !== 'cancelado';
        return isActiveToday;
      }) || [];

      const todayReservations: TodayReservation[] = [
        ...todayGrooming.map(apt => ({
          id: apt.id,
          type: 'grooming' as const,
          clientId: apt.client_id,
          clientName: clientMap.get(apt.client_id) || 'Cliente',
          petId: apt.pet_id,
          petName: petMap.get(apt.pet_id) || 'Pet',
          service: apt.service_type === 'banho_tosa' ? 'Banho + Tosa' : 'Banho',
          status: apt.status || 'agendado',
          price: apt.price || 0,
          scheduledAt: apt.start_datetime,
        })),
        ...todayHotel.map(stay => ({
          id: stay.id,
          type: 'hotel' as const,
          clientId: stay.client_id,
          clientName: clientMap.get(stay.client_id) || 'Cliente',
          petId: stay.pet_id,
          petName: petMap.get(stay.pet_id) || 'Pet',
          service: stay.is_creche ? 'Creche' : 'Hotelzinho',
          status: stay.status || 'reservado',
          price: stay.total_price || 0,
          scheduledAt: stay.check_in,
        })),
      ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      setData({
        monthlyGrooming,
        monthlyHotel,
        monthlyTotal,
        forecastRevenue: {
          grooming: groomingForecast,
          hotel: hotelForecast,
          total: groomingForecast + hotelForecast,
        },
        completedRevenue: {
          grooming: groomingCompletedRevenue,
          hotel: hotelCompletedRevenue,
          total: groomingCompletedRevenue + hotelCompletedRevenue,
        },
        todayReservations,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscriptions
    const groomingChannel = supabase
      .channel('dashboard-grooming-v2')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bath_grooming_appointments'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const hotelChannel = supabase
      .channel('dashboard-hotel-v2')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hotel_stays'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(groomingChannel);
      supabase.removeChannel(hotelChannel);
    };
  }, [fetchDashboardData]);

  // Filter data based on selected filter
  const getFilteredData = useCallback(() => {
    const { monthlyGrooming, monthlyHotel, monthlyTotal, forecastRevenue, completedRevenue, todayReservations, isLoading } = data;

    if (filter === 'grooming') {
      return {
        monthlyStats: monthlyGrooming,
        forecastRevenue: forecastRevenue.grooming,
        completedRevenue: completedRevenue.grooming,
        todayReservations: todayReservations.filter(r => r.type === 'grooming'),
        isLoading,
        // Keep raw data for detailed views
        rawData: data,
      };
    }

    if (filter === 'hotel') {
      return {
        monthlyStats: monthlyHotel,
        forecastRevenue: forecastRevenue.hotel,
        completedRevenue: completedRevenue.hotel,
        todayReservations: todayReservations.filter(r => r.type === 'hotel'),
        isLoading,
        rawData: data,
      };
    }

    // 'all' filter
    return {
      monthlyStats: monthlyTotal,
      forecastRevenue: forecastRevenue.total,
      completedRevenue: completedRevenue.total,
      todayReservations,
      isLoading,
      rawData: data,
    };
  }, [data, filter]);

  return {
    ...getFilteredData(),
    refetch: fetchDashboardData,
  };
}
