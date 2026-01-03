import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  // Banho & Tosa
  groomingScheduled: number;
  groomingInProgress: number;
  groomingCompleted: number;
  groomingTotal: number;
  groomingForecastRevenue: number;
  groomingCompletedRevenue: number;
  
  // Hotelzinho
  hotelCurrentGuests: number;
  hotelFutureCheckIns: number;
  hotelTodayCheckOuts: number;
  hotelForecastRevenue: number;
  hotelCompletedRevenue: number;
  
  // Totals
  totalForecastRevenue: number;
  totalCompletedRevenue: number;
  
  // Today's appointments
  todayAppointments: Array<{
    id: string;
    clientName: string;
    petName: string;
    service: string;
    status: string;
    price: number;
    scheduledAt: string;
  }>;
  
  // Loading state
  isLoading: boolean;
}

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    groomingScheduled: 0,
    groomingInProgress: 0,
    groomingCompleted: 0,
    groomingTotal: 0,
    groomingForecastRevenue: 0,
    groomingCompletedRevenue: 0,
    hotelCurrentGuests: 0,
    hotelFutureCheckIns: 0,
    hotelTodayCheckOuts: 0,
    hotelForecastRevenue: 0,
    hotelCompletedRevenue: 0,
    totalForecastRevenue: 0,
    totalCompletedRevenue: 0,
    todayAppointments: [],
    isLoading: true,
  });

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch grooming appointments
      const { data: groomingData } = await supabase
        .from('bath_grooming_appointments')
        .select('*');

      // Fetch hotel stays
      const { data: hotelData } = await supabase
        .from('hotel_stays')
        .select('*');

      // Fetch clients and pets for names
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const { data: pets } = await supabase
        .from('pets')
        .select('id, name');

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      const petMap = new Map(pets?.map(p => [p.id, p.name]) || []);

      // Process grooming data
      const todayGrooming = groomingData?.filter(apt => {
        const aptDate = new Date(apt.start_datetime);
        return aptDate >= today && aptDate <= todayEnd;
      }) || [];

      const groomingScheduled = todayGrooming.filter(apt => apt.status === 'agendado').length;
      const groomingInProgress = todayGrooming.filter(apt => apt.status === 'em_atendimento').length;
      const groomingCompleted = todayGrooming.filter(apt => apt.status === 'finalizado').length;

      // Calculate grooming revenue
      const groomingForecastRevenue = todayGrooming
        .filter(apt => apt.status === 'agendado' || apt.status === 'em_atendimento')
        .reduce((sum, apt) => sum + (apt.price || 0), 0);

      const groomingCompletedRevenue = todayGrooming
        .filter(apt => apt.status === 'finalizado')
        .reduce((sum, apt) => sum + (apt.price || 0), 0);

      // Process hotel data
      const hotelCurrentGuests = hotelData?.filter(stay => stay.status === 'hospedado').length || 0;
      
      const hotelFutureCheckIns = hotelData?.filter(stay => {
        const checkIn = new Date(stay.check_in);
        return checkIn > today && stay.status === 'reservado';
      }).length || 0;

      const hotelTodayCheckOuts = hotelData?.filter(stay => {
        const checkOut = new Date(stay.check_out);
        return checkOut >= today && checkOut <= todayEnd;
      }).length || 0;

      // Calculate hotel revenue
      const hotelForecastRevenue = hotelData
        ?.filter(stay => stay.status === 'reservado' || stay.status === 'hospedado')
        .reduce((sum, stay) => sum + (stay.total_price || 0), 0) || 0;

      const hotelCompletedRevenue = hotelData
        ?.filter(stay => stay.status === 'check_out_realizado')
        .reduce((sum, stay) => sum + (stay.total_price || 0), 0) || 0;

      // Format today's appointments
      const todayAppointments = todayGrooming.map(apt => ({
        id: apt.id,
        clientName: clientMap.get(apt.client_id) || 'Cliente',
        petName: petMap.get(apt.pet_id) || 'Pet',
        service: apt.service_type === 'banho_tosa' ? 'Banho + Tosa' : 'Banho',
        status: apt.status || 'agendado',
        price: apt.price || 0,
        scheduledAt: apt.start_datetime,
      })).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      setData({
        groomingScheduled,
        groomingInProgress,
        groomingCompleted,
        groomingTotal: todayGrooming.length,
        groomingForecastRevenue,
        groomingCompletedRevenue,
        hotelCurrentGuests,
        hotelFutureCheckIns,
        hotelTodayCheckOuts,
        hotelForecastRevenue,
        hotelCompletedRevenue,
        totalForecastRevenue: groomingForecastRevenue + hotelForecastRevenue,
        totalCompletedRevenue: groomingCompletedRevenue + hotelCompletedRevenue,
        todayAppointments,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscriptions
    const groomingChannel = supabase
      .channel('dashboard-grooming')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bath_grooming_appointments'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const hotelChannel = supabase
      .channel('dashboard-hotel')
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
  }, []);

  return data;
}
