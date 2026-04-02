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
      bookings: {
        Row: {
          beds24_booking_id: string
          checkin_date: string
          checkout_date: string
          created_at: string | null
          guest_name: string | null
          id: string
          nights: number | null
          ota_name: string | null
          property_id: string
          room_id: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          beds24_booking_id: string
          checkin_date: string
          checkout_date: string
          created_at?: string | null
          guest_name?: string | null
          id?: string
          nights?: number | null
          ota_name?: string | null
          property_id: string
          room_id: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          beds24_booking_id?: string
          checkin_date?: string
          checkout_date?: string
          created_at?: string | null
          guest_name?: string | null
          id?: string
          nights?: number | null
          ota_name?: string | null
          property_id?: string
          room_id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_revenues: {
        Row: {
          beds24_booking_id: string
          booking_id: string | null
          created_at: string | null
          daily_amount: number
          id: string
          target_date: string
          updated_at: string | null
        }
        Insert: {
          beds24_booking_id: string
          booking_id?: string | null
          created_at?: string | null
          daily_amount: number
          id?: string
          target_date: string
          updated_at?: string | null
        }
        Update: {
          beds24_booking_id?: string
          booking_id?: string | null
          created_at?: string | null
          daily_amount?: number
          id?: string
          target_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_revenues_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      properties_inventory: {
        Row: {
          available_flag: boolean | null
          beds24_property_id: string
          beds24_room_id: string
          created_at: string | null
          id: string
          min_stay: number | null
          price: number | null
          target_date: string
          updated_at: string | null
        }
        Insert: {
          available_flag?: boolean | null
          beds24_property_id: string
          beds24_room_id: string
          created_at?: string | null
          id?: string
          min_stay?: number | null
          price?: number | null
          target_date: string
          updated_at?: string | null
        }
        Update: {
          available_flag?: boolean | null
          beds24_property_id?: string
          beds24_room_id?: string
          created_at?: string | null
          id?: string
          min_stay?: number | null
          price?: number | null
          target_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
  }
}
