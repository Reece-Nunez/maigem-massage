export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          duration_minutes: number
          price_cents: number | null
          price_display: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration_minutes: number
          price_cents?: number | null
          price_display?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price_cents?: number | null
          price_display?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      availability: {
        Row: {
          id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      blocked_times: {
        Row: {
          id: string
          start_datetime: string
          end_datetime: string
          reason: string | null
          is_all_day: boolean
          created_at: string
        }
        Insert: {
          id?: string
          start_datetime: string
          end_datetime: string
          reason?: string | null
          is_all_day?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          start_datetime?: string
          end_datetime?: string
          reason?: string | null
          is_all_day?: boolean
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          auth_user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          client_id: string
          service_id: string
          start_datetime: string
          end_datetime: string
          status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          client_notes: string | null
          admin_notes: string | null
          reminder_sent: boolean
          confirmation_sent: boolean
          cancellation_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          start_datetime: string
          end_datetime: string
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          client_notes?: string | null
          admin_notes?: string | null
          reminder_sent?: boolean
          confirmation_sent?: boolean
          cancellation_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          start_datetime?: string
          end_datetime?: string
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          client_notes?: string | null
          admin_notes?: string | null
          reminder_sent?: boolean
          confirmation_sent?: boolean
          cancellation_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          auth_user_id: string
          created_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
        }
      }
      admin_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
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
  }
}

// Helper types
export type Service = Database['public']['Tables']['services']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
export type BlockedTime = Database['public']['Tables']['blocked_times']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']
export type AdminSetting = Database['public']['Tables']['admin_settings']['Row']

// Extended types with relations
export type AppointmentWithDetails = Appointment & {
  client: Client
  service: Service
}
