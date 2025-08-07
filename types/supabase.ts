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
      auction_audit_logs: {
        Row: {
          action: string
          auction_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          auction_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          auction_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_audit_logs_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          is_winning_bid: boolean | null
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          is_winning_bid?: boolean | null
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          is_winning_bid?: boolean | null
          user_id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_notifications: {
        Row: {
          auction_id: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          consignment_date: string
          created_at: string
          created_by: string
          description: string
          end_time: string
          id: string
          start_time: string
          status: string
          title: string
          updated_at: string
          vehicle_type: string
          winner_id: string | null
          winning_bid_id: string | null
        }
        Insert: {
          consignment_date: string
          created_at?: string
          created_by: string
          description: string
          end_time: string
          id?: string
          start_time: string
          status?: string
          title: string
          updated_at?: string
          vehicle_type: string
          winner_id?: string | null
          winning_bid_id?: string | null
        }
        Update: {
          consignment_date?: string
          created_at?: string
          created_by?: string
          description?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_type?: string
          winner_id?: string | null
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_winning_bid_id_fkey"
            columns: ["winning_bid_id"]
            isOneToOne: false
            referencedRelation: "auction_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          phone_number: string | null
          push_token: string | null
          role: string
          updated_at: string
          upi_id: string | null
          username: string
          vehicle_type: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          phone_number?: string | null
          push_token?: string | null
          role: string
          updated_at?: string
          upi_id?: string | null
          username: string
          vehicle_type?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          push_token?: string | null
          role?: string
          updated_at?: string
          upi_id?: string | null
          username?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_auctions_summary: {
        Row: {
          consignment_date: string | null
          created_at: string | null
          created_by: string | null
          creator_phone: string | null
          creator_username: string | null
          current_highest_bid: number | null
          description: string | null
          end_time: string | null
          id: string | null
          start_time: string | null
          status: string | null
          title: string | null
          total_bids: number | null
          vehicle_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications_summary: {
        Row: {
          auctions_won: number | null
          latest_notification: string | null
          times_outbid: number | null
          total_notifications: number | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_auction_by_consigner: {
        Args: { p_auction_id: string; p_user_id: string }
        Returns: Json
      }
      cancel_bid_by_driver: {
        Args: { p_bid_id: string; p_user_id: string }
        Returns: Json
      }
      check_and_close_expired_auctions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      close_auction_optimized: {
        Args: { p_auction_id: string }
        Returns: Json
      }
      close_auction_with_notifications: {
        Args: { p_auction_id: string }
        Returns: Json
      }
      create_auction_fast: {
        Args: { auction_data: Json }
        Returns: Json
      }
      create_auction_notification: {
        Args: {
          p_user_id: string
          p_auction_id: string
          p_type: string
          p_message: string
          p_data?: Json
        }
        Returns: string
      }
      create_auction_optimized: {
        Args: {
          p_title: string
          p_description: string
          p_vehicle_type: string
          p_start_time: string
          p_end_time: string
          p_consignment_date: string
          p_created_by: string
        }
        Returns: string
      }
      create_bid_optimized: {
        Args: { p_auction_id: string; p_user_id: string; p_amount: number }
        Returns: Json
      }
      create_notification_with_push: {
        Args: {
          p_user_id: string
          p_auction_id: string
          p_type: string
          p_message: string
          p_data?: Json
        }
        Returns: string
      }
      get_auction_details_fast: {
        Args: { p_auction_id: string }
        Returns: Json
      }
      get_auction_details_optimized: {
        Args: { p_auction_id: string }
        Returns: Json
      }
      get_auctions_paginated: {
        Args: {
          p_status?: string
          p_vehicle_type?: string
          p_limit?: number
          p_offset?: number
          p_user_role?: string
        }
        Returns: Json
      }
      get_notification_system_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_auctions_optimized: {
        Args: { p_user_id: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      log_auction_activity: {
        Args: {
          p_auction_id: string
          p_user_id: string
          p_action: string
          p_details?: Json
        }
        Returns: string
      }
      place_bid_fast: {
        Args: { p_auction_id: string; p_bid_amount: number }
        Returns: Json
      }
      run_auction_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      send_push_notification: {
        Args: {
          p_user_id: string
          p_title: string
          p_body: string
          p_data?: Json
        }
        Returns: boolean
      }
      test_user_notification: {
        Args: { p_user_id: string; p_test_message?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for better development experience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type Profile = Tables<'profiles'>
export type Auction = Tables<'auctions'>
export type AuctionBid = Tables<'auction_bids'>
export type AuctionNotification = Tables<'auction_notifications'>
export type AuctionAuditLog = Tables<'auction_audit_logs'>

// View types
export type ActiveAuctionSummary = Database['public']['Views']['active_auctions_summary']['Row']
export type UserNotificationSummary = Database['public']['Views']['user_notifications_summary']['Row']

// Enum types
export type UserRole = 'consigner' | 'driver'
export type VehicleType = 'three_wheeler' | 'pickup_truck' | 'mini_truck' | 'medium_truck' | 'large_truck'
export type AuctionStatus = 'active' | 'completed' | 'cancelled'
export type NotificationType = 
  | 'auction_created' 
  | 'bid_placed' 
  | 'outbid' 
  | 'auction_won' 
  | 'auction_lost' 
  | 'auction_cancelled' 
  | 'bid_cancelled'
