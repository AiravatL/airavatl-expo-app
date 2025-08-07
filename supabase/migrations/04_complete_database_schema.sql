-- Complete Database Schema Migration
-- This file contains the complete schema of the production database
-- Generated from database audit on 2025-01-26

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('consigner', 'driver')) NOT NULL,
    vehicle_type TEXT,
    driver_license TEXT,
    push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auctions table
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    pickup_location TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    pickup_date TIMESTAMPTZ NOT NULL,
    delivery_date TIMESTAMPTZ NOT NULL,
    starting_price DECIMAL(10,2) NOT NULL CHECK (starting_price > 0),
    current_price DECIMAL(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auction bids table
CREATE TABLE IF NOT EXISTS public.auction_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(auction_id, user_id)
);

-- Auction notifications table
CREATE TABLE IF NOT EXISTS public.auction_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('new_auction', 'bid_placed', 'auction_won', 'auction_completed', 'auction_ending_soon')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auction audit logs table
CREATE TABLE IF NOT EXISTS public.auction_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_created_by ON public.auctions(created_by);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON public.auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user_id ON public.auction_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_notifications_user_id ON public.auction_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_notifications_is_read ON public.auction_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_auction_audit_logs_auction_id ON public.auction_audit_logs(auction_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles(push_token);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auctions policies
CREATE POLICY "Drivers view active auctions" ON public.auctions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'driver' 
            AND (auctions.status = 'active' OR auctions.winner_id = auth.uid())
        )
    );

CREATE POLICY "Consigners view own auctions" ON public.auctions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'consigner' 
            AND auctions.created_by = auth.uid()
        )
    );

CREATE POLICY "Consigners create auctions" ON public.auctions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'consigner'
        ) AND auth.uid() = created_by
    );

-- Auction bids policies
CREATE POLICY "View bids for visible auctions" ON public.auction_bids
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auctions 
            WHERE auctions.id = auction_bids.auction_id
        )
    );

CREATE POLICY "Drivers create bids" ON public.auction_bids
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'driver'
        ) AND auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM auctions 
            WHERE auctions.id = auction_bids.auction_id 
            AND auctions.status = 'active' 
            AND auctions.end_time > now()
        )
    );

-- Notifications policies
CREATE POLICY "Users view own notifications" ON public.auction_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.auction_notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System creates notifications" ON public.auction_notifications
    FOR INSERT WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Users view relevant audit logs" ON public.auction_audit_logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auctions 
            WHERE auctions.id = auction_audit_logs.auction_id 
            AND (auctions.created_by = auth.uid() OR auctions.winner_id = auth.uid())
        )
    );

CREATE POLICY "System creates audit logs" ON public.auction_audit_logs
    FOR INSERT WITH CHECK (true);
