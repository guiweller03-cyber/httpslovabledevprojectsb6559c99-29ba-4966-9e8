export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bath_grooming_appointments: {
        Row: {
          client_id: string
          client_plan_id: string | null
          created_at: string | null
          end_datetime: string
          google_event_id: string | null
          grooming_type: string | null
          id: string
          is_plan_usage: boolean | null
          notes: string | null
          optional_services: string[] | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          pet_id: string
          price: number | null
          service_type: string
          start_datetime: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_plan_id?: string | null
          created_at?: string | null
          end_datetime: string
          google_event_id?: string | null
          grooming_type?: string | null
          id?: string
          is_plan_usage?: boolean | null
          notes?: string | null
          optional_services?: string[] | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pet_id: string
          price?: number | null
          service_type: string
          start_datetime: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_plan_id?: string | null
          created_at?: string | null
          end_datetime?: string
          google_event_id?: string | null
          grooming_type?: string | null
          id?: string
          is_plan_usage?: boolean | null
          notes?: string | null
          optional_services?: string[] | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pet_id?: string
          price?: number | null
          service_type?: string
          start_datetime?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bath_grooming_appointments_client_plan_id_fkey"
            columns: ["client_plan_id"]
            isOneToOne: false
            referencedRelation: "client_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bath_plans: {
        Row: {
          created_at: string | null
          id: string
          plan_name: string
          price: number
          service_type: string
          total_baths: number
          validity_days: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_name: string
          price: number
          service_type?: string
          total_baths: number
          validity_days?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_name?: string
          price?: number
          service_type?: string
          total_baths?: number
          validity_days?: number | null
        }
        Relationships: []
      }
      client_plans: {
        Row: {
          active: boolean | null
          client_id: string
          created_at: string | null
          expires_at: string
          id: string
          pet_id: string
          plan_id: string
          price_paid: number
          purchased_at: string | null
          service_type: string
          total_baths: number
          updated_at: string | null
          used_baths: number
        }
        Insert: {
          active?: boolean | null
          client_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          pet_id: string
          plan_id: string
          price_paid: number
          purchased_at?: string | null
          service_type?: string
          total_baths: number
          updated_at?: string | null
          used_baths?: number
        }
        Update: {
          active?: boolean | null
          client_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          pet_id?: string
          plan_id?: string
          price_paid?: number
          purchased_at?: string | null
          service_type?: string
          total_baths?: number
          updated_at?: string | null
          used_baths?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "bath_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          last_interaction: string | null
          last_purchase: string | null
          name: string
          neighborhood: string | null
          state: string | null
          whatsapp: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_interaction?: string | null
          last_purchase?: string | null
          name: string
          neighborhood?: string | null
          state?: string | null
          whatsapp: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_interaction?: string | null
          last_purchase?: string | null
          name?: string
          neighborhood?: string | null
          state?: string | null
          whatsapp?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id_banho_tosa: string | null
          calendar_id_hotelzinho: string | null
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          calendar_id_banho_tosa?: string | null
          calendar_id_hotelzinho?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          calendar_id_banho_tosa?: string | null
          calendar_id_hotelzinho?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      health_reminders: {
        Row: {
          affected_services: string[] | null
          client_id: string
          created_at: string | null
          days_remaining: number | null
          expires_at: string
          id: string
          pet_id: string
          reminder_type: string
          resolved_at: string | null
          sent_to_n8n_at: string | null
          status: string | null
        }
        Insert: {
          affected_services?: string[] | null
          client_id: string
          created_at?: string | null
          days_remaining?: number | null
          expires_at: string
          id?: string
          pet_id: string
          reminder_type: string
          resolved_at?: string | null
          sent_to_n8n_at?: string | null
          status?: string | null
        }
        Update: {
          affected_services?: string[] | null
          client_id?: string
          created_at?: string | null
          days_remaining?: number | null
          expires_at?: string
          id?: string
          pet_id?: string
          reminder_type?: string
          resolved_at?: string | null
          sent_to_n8n_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      hotel_rates: {
        Row: {
          created_at: string | null
          daily_rate: number
          id: string
          size_category: string
        }
        Insert: {
          created_at?: string | null
          daily_rate: number
          id?: string
          size_category: string
        }
        Update: {
          created_at?: string | null
          daily_rate?: number
          id?: string
          size_category?: string
        }
        Relationships: []
      }
      hotel_stays: {
        Row: {
          check_in: string
          check_out: string
          client_id: string
          client_plan_id: string | null
          created_at: string | null
          daily_rate: number
          google_event_id: string | null
          id: string
          is_creche: boolean | null
          is_plan_usage: boolean | null
          items_brought: string[] | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          pet_id: string
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          client_id: string
          client_plan_id?: string | null
          created_at?: string | null
          daily_rate: number
          google_event_id?: string | null
          id?: string
          is_creche?: boolean | null
          is_plan_usage?: boolean | null
          items_brought?: string[] | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pet_id: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          client_id?: string
          client_plan_id?: string | null
          created_at?: string | null
          daily_rate?: number
          google_event_id?: string | null
          id?: string
          is_creche?: boolean | null
          is_plan_usage?: boolean | null
          items_brought?: string[] | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pet_id?: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_stays_client_plan_id_fkey"
            columns: ["client_plan_id"]
            isOneToOne: false
            referencedRelation: "client_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_health: {
        Row: {
          antiparasitic_applied_at: string | null
          antiparasitic_type: string | null
          antiparasitic_validity_days: number | null
          antipulgas_valid_until: string | null
          created_at: string | null
          id: string
          pet_id: string
          updated_at: string | null
          vaccine_applied_at: string | null
          vaccine_name: string | null
          vaccine_type: string | null
          vaccine_valid_until: string | null
          vaccine_validity_months: number | null
          vermifuge_applied_at: string | null
          vermifuge_type: string | null
          vermifuge_valid_until: string | null
          vermifuge_validity_days: number | null
        }
        Insert: {
          antiparasitic_applied_at?: string | null
          antiparasitic_type?: string | null
          antiparasitic_validity_days?: number | null
          antipulgas_valid_until?: string | null
          created_at?: string | null
          id?: string
          pet_id: string
          updated_at?: string | null
          vaccine_applied_at?: string | null
          vaccine_name?: string | null
          vaccine_type?: string | null
          vaccine_valid_until?: string | null
          vaccine_validity_months?: number | null
          vermifuge_applied_at?: string | null
          vermifuge_type?: string | null
          vermifuge_valid_until?: string | null
          vermifuge_validity_days?: number | null
        }
        Update: {
          antiparasitic_applied_at?: string | null
          antiparasitic_type?: string | null
          antiparasitic_validity_days?: number | null
          antipulgas_valid_until?: string | null
          created_at?: string | null
          id?: string
          pet_id?: string
          updated_at?: string | null
          vaccine_applied_at?: string | null
          vaccine_name?: string | null
          vaccine_type?: string | null
          vaccine_valid_until?: string | null
          vaccine_validity_months?: number | null
          vermifuge_applied_at?: string | null
          vermifuge_type?: string | null
          vermifuge_valid_until?: string | null
          vermifuge_validity_days?: number | null
        }
        Relationships: []
      }
      pet_vacinas: {
        Row: {
          created_at: string | null
          data_aplicacao: string
          data_vencimento: string
          id: string
          nome: string
          pet_id: string
          tipo: string
          validade_meses: number
        }
        Insert: {
          created_at?: string | null
          data_aplicacao: string
          data_vencimento: string
          id?: string
          nome: string
          pet_id: string
          tipo: string
          validade_meses?: number
        }
        Update: {
          created_at?: string | null
          data_aplicacao?: string
          data_vencimento?: string
          id?: string
          nome?: string
          pet_id?: string
          tipo?: string
          validade_meses?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_vacinas_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          address: string | null
          breed: string | null
          client_id: string
          coat_type: string | null
          created_at: string | null
          delivery_time: string | null
          grooming_type: string | null
          id: string
          name: string
          neighborhood: string | null
          photo_url: string | null
          pickup_delivery: boolean | null
          pickup_time: string | null
          preferred_service: string | null
          size: string | null
          species: string
          weight: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          breed?: string | null
          client_id: string
          coat_type?: string | null
          created_at?: string | null
          delivery_time?: string | null
          grooming_type?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          photo_url?: string | null
          pickup_delivery?: boolean | null
          pickup_time?: string | null
          preferred_service?: string | null
          size?: string | null
          species: string
          weight?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          breed?: string | null
          client_id?: string
          coat_type?: string | null
          created_at?: string | null
          delivery_time?: string | null
          grooming_type?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          photo_url?: string | null
          pickup_delivery?: boolean | null
          pickup_time?: string | null
          preferred_service?: string | null
          size?: string | null
          species?: string
          weight?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          price: number
          service_type: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          price: number
          service_type?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          service_type?: string | null
        }
        Relationships: []
      }
      service_prices: {
        Row: {
          breed: string
          coat_type: string
          created_at: string | null
          id: string
          price: number
          service_type: string
          size_category: string
        }
        Insert: {
          breed: string
          coat_type: string
          created_at?: string | null
          id?: string
          price: number
          service_type: string
          size_category: string
        }
        Update: {
          breed?: string
          coat_type?: string
          created_at?: string | null
          id?: string
          price?: number
          service_type?: string
          size_category?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
