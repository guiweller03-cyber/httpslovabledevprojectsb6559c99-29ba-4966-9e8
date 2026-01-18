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
          arrival_time: string | null
          bath_start_time: string | null
          client_id: string
          client_plan_id: string | null
          completed_time: string | null
          created_at: string | null
          end_datetime: string
          google_event_id: string | null
          grooming_type: string | null
          id: string
          is_plan_usage: boolean | null
          kanban_status: string | null
          notes: string | null
          optional_services: string[] | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          pet_id: string
          price: number | null
          rota_buscar: boolean | null
          rota_entregar: boolean | null
          service_type: string
          start_datetime: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          arrival_time?: string | null
          bath_start_time?: string | null
          client_id: string
          client_plan_id?: string | null
          completed_time?: string | null
          created_at?: string | null
          end_datetime: string
          google_event_id?: string | null
          grooming_type?: string | null
          id?: string
          is_plan_usage?: boolean | null
          kanban_status?: string | null
          notes?: string | null
          optional_services?: string[] | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pet_id: string
          price?: number | null
          rota_buscar?: boolean | null
          rota_entregar?: boolean | null
          service_type: string
          start_datetime: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          arrival_time?: string | null
          bath_start_time?: string | null
          client_id?: string
          client_plan_id?: string | null
          completed_time?: string | null
          created_at?: string | null
          end_datetime?: string
          google_event_id?: string | null
          grooming_type?: string | null
          id?: string
          is_plan_usage?: boolean | null
          kanban_status?: string | null
          notes?: string | null
          optional_services?: string[] | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pet_id?: string
          price?: number | null
          rota_buscar?: boolean | null
          rota_entregar?: boolean | null
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
      cash_movements: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string | null
          id: string
          performed_by: string | null
          reason: string | null
          type: string
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          reason?: string | null
          type: string
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          reason?: string | null
          type?: string
        }
        Relationships: []
      }
      cash_register: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          created_at: string | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          opening_amount: number
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Relationships: []
      }
      certificados_digitais: {
        Row: {
          certificado_base64: string | null
          company_id: string
          created_at: string | null
          id: string
          nome_arquivo: string
          senha_hash: string | null
          status: string | null
          validade: string
        }
        Insert: {
          certificado_base64?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          nome_arquivo: string
          senha_hash?: string | null
          status?: string | null
          validade: string
        }
        Update: {
          certificado_base64?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          senha_hash?: string | null
          status?: string | null
          validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      commissions: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string | null
          id: string
          paid_at: string | null
          rate: number
          sale_id: string | null
          sale_item_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          paid_at?: string | null
          rate: number
          sale_id?: string | null
          sale_item_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          paid_at?: string | null
          rate?: number
          sale_id?: string | null
          sale_item_id?: string | null
          status?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          bairro: string | null
          cep: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string | null
          email: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logradouro: string | null
          municipio: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_fiscal: {
        Row: {
          ambiente: string | null
          company_id: string
          created_at: string | null
          csosn_produtos: string | null
          csosn_servicos: string | null
          emitir_automatico: boolean | null
          id: string
          numero_atual: number | null
          regime_tributario: string | null
          serie: string | null
          tipo_nota: string | null
          updated_at: string | null
        }
        Insert: {
          ambiente?: string | null
          company_id: string
          created_at?: string | null
          csosn_produtos?: string | null
          csosn_servicos?: string | null
          emitir_automatico?: boolean | null
          id?: string
          numero_atual?: number | null
          regime_tributario?: string | null
          serie?: string | null
          tipo_nota?: string | null
          updated_at?: string | null
        }
        Update: {
          ambiente?: string | null
          company_id?: string
          created_at?: string | null
          csosn_produtos?: string | null
          csosn_servicos?: string | null
          emitir_automatico?: boolean | null
          id?: string
          numero_atual?: number | null
          regime_tributario?: string | null
          serie?: string | null
          tipo_nota?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_fiscal_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          commission_rate: number | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      notas_fiscais: {
        Row: {
          ambiente: string | null
          chave: string | null
          company_id: string
          created_at: string | null
          erro_sefaz: string | null
          id: string
          numero: number
          pdf_url: string | null
          referencia_focus: string | null
          sale_id: string | null
          serie: string
          status: string | null
          tipo: string
          xml: string | null
        }
        Insert: {
          ambiente?: string | null
          chave?: string | null
          company_id: string
          created_at?: string | null
          erro_sefaz?: string | null
          id?: string
          numero: number
          pdf_url?: string | null
          referencia_focus?: string | null
          sale_id?: string | null
          serie: string
          status?: string | null
          tipo: string
          xml?: string | null
        }
        Update: {
          ambiente?: string | null
          chave?: string | null
          company_id?: string
          created_at?: string | null
          erro_sefaz?: string | null
          id?: string
          numero?: number
          pdf_url?: string | null
          referencia_focus?: string | null
          sale_id?: string | null
          serie?: string
          status?: string | null
          tipo?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
          age: number | null
          allergies: string | null
          breed: string | null
          client_id: string
          coat_type: string | null
          created_at: string | null
          delivery_time: string | null
          grooming_type: string | null
          id: string
          logistics_type: string | null
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
          age?: number | null
          allergies?: string | null
          breed?: string | null
          client_id: string
          coat_type?: string | null
          created_at?: string | null
          delivery_time?: string | null
          grooming_type?: string | null
          id?: string
          logistics_type?: string | null
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
          age?: number | null
          allergies?: string | null
          breed?: string | null
          client_id?: string
          coat_type?: string | null
          created_at?: string | null
          delivery_time?: string | null
          grooming_type?: string | null
          id?: string
          logistics_type?: string | null
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
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          brand: string | null
          category: string
          commission_rate: number | null
          control_stock: boolean | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          min_stock_quantity: number | null
          name: string
          photo_url: string | null
          sale_price: number
          sku: string | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string
          commission_rate?: number | null
          control_stock?: boolean | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          min_stock_quantity?: number | null
          name: string
          photo_url?: string | null
          sale_price: number
          sku?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string
          commission_rate?: number | null
          control_stock?: boolean | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          min_stock_quantity?: number | null
          name?: string
          photo_url?: string | null
          sale_price?: number
          sku?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          commission_rate: number | null
          covered_by_plan: boolean | null
          created_at: string | null
          description: string
          discount_amount: number | null
          id: string
          item_type: string
          pet_id: string | null
          product_id: string | null
          quantity: number
          sale_id: string | null
          source_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          commission_rate?: number | null
          covered_by_plan?: boolean | null
          created_at?: string | null
          description: string
          discount_amount?: number | null
          id?: string
          item_type: string
          pet_id?: string | null
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          source_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          commission_rate?: number | null
          covered_by_plan?: boolean | null
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          id?: string
          item_type?: string
          pet_id?: string | null
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          source_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: []
      }
      sales: {
        Row: {
          cash_register_id: string | null
          client_id: string | null
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          employee_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          payment_method: string
          payment_status: string
          pet_id: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          cash_register_id?: string | null
          client_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          employee_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method: string
          payment_status?: string
          pet_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          cash_register_id?: string | null
          client_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          employee_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string
          payment_status?: string
          pet_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
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
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          performed_by: string | null
          product_id: string
          quantity: number
          reason: string | null
          sale_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          performed_by?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          sale_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          sale_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          business_name: string | null
          created_at: string | null
          id: string
          mod_caixa: boolean | null
          mod_clinica: boolean | null
          mod_comissao: boolean | null
          mod_dashboard_completo: boolean | null
          mod_estoque: boolean | null
          mod_financeiro_avancado: boolean | null
          mod_hotel: boolean | null
          mod_marketing: boolean | null
          mod_pdv: boolean | null
          mod_petshop: boolean | null
          mod_produtos: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          id?: string
          mod_caixa?: boolean | null
          mod_clinica?: boolean | null
          mod_comissao?: boolean | null
          mod_dashboard_completo?: boolean | null
          mod_estoque?: boolean | null
          mod_financeiro_avancado?: boolean | null
          mod_hotel?: boolean | null
          mod_marketing?: boolean | null
          mod_pdv?: boolean | null
          mod_petshop?: boolean | null
          mod_produtos?: boolean | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          id?: string
          mod_caixa?: boolean | null
          mod_clinica?: boolean | null
          mod_comissao?: boolean | null
          mod_dashboard_completo?: boolean | null
          mod_estoque?: boolean | null
          mod_financeiro_avancado?: boolean | null
          mod_hotel?: boolean | null
          mod_marketing?: boolean | null
          mod_pdv?: boolean | null
          mod_petshop?: boolean | null
          mod_produtos?: boolean | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      plan_type: "basic" | "hotel" | "premium"
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
    Enums: {
      app_role: ["admin", "manager", "employee"],
      plan_type: ["basic", "hotel", "premium"],
    },
  },
} as const
