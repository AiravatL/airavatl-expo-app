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
      profiles: {
        Row: {
          id: string
          username: string
          created_at: string | null
          updated_at: string | null
          phone_number: string | null
          upi_id: string | null
          address: string | null
          bio: string | null
          avatar_url: string | null
          role: string
        }
        Insert: {
          id: string
          username: string
          created_at?: string | null
          updated_at?: string | null
          phone_number?: string | null
          upi_id?: string | null
          address?: string | null
          bio?: string | null
          avatar_url?: string | null
          role: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string | null
          updated_at?: string | null
          phone_number?: string | null
          upi_id?: string | null
          address?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      auctions: {
        Row: {
          id: string
          title: string
          description: string
          start_time: string
          end_time: string
          status: string
          winner_id: string | null
          winning_bid_id: string | null
          created_at: string | null
          created_by: string
          vehicle_type: string
          consignment_date: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          start_time: string
          end_time: string
          status?: string
          winner_id?: string | null
          winning_bid_id?: string | null
          created_at?: string | null
          created_by: string
          vehicle_type?: string
          consignment_date?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          start_time?: string
          end_time?: string
          status?: string
          winner_id?: string | null
          winning_bid_id?: string | null
          created_at?: string | null
          created_by?: string
          vehicle_type?: string
          consignment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_winner_id_profiles_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      auction_bids: {
        Row: {
          id: string
          auction_id: string
          user_id: string
          amount: number
          created_at: string | null
          is_winning_bid: boolean | null
        }
        Insert: {
          id?: string
          auction_id: string
          user_id: string
          amount: number
          created_at?: string | null
          is_winning_bid?: boolean | null
        }
        Update: {
          id?: string
          auction_id?: string
          user_id?: string
          amount?: number
          created_at?: string | null
          is_winning_bid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      auction_notifications: {
        Row: {
          id: string
          user_id: string | null
          auction_id: string | null
          type: string
          message: string
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          auction_id?: string | null
          type: string
          message: string
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          auction_id?: string | null
          type?: string
          message?: string
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_notifications_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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