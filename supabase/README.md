# Airavatl Auction Platform - Database Documentation

## Overview

This directory contains the complete database schema and migrations for the Airavatl auction platform. The database is built on Supabase (PostgreSQL) with Row Level Security (RLS), real-time subscriptions, and comprehensive audit logging.

## Current Database Schema (Updated: August 7, 2025)

### Core Tables

#### 1. profiles

User management table supporting two roles: `consigner` and `driver`.

**Key Features:**

- References `auth.users` for authentication
- Support for 5 vehicle types
- UPI payment integration
- Push notification tokens
- Phone number validation

**Vehicle Types Supported:**

- `three_wheeler`
- `pickup_truck`
- `mini_truck`
- `medium_truck`
- `large_truck`

#### 2. auctions

Core auction management with enhanced vehicle type support.

**Key Features:**

- Flexible auction duration (5 minutes to 7 days)
- Three status types: `active`, `completed`, `cancelled`
- Winner tracking with bid references
- Consignment date scheduling

#### 3. auction_bids

Bidding system with unique constraints and winner tracking.

**Key Features:**

- Lowest bid wins (reverse auction model)
- Unique constraint per user/auction/amount
- Winning bid tracking
- Positive amount validation

#### 4. auction_notifications

Enhanced notification system with 7 notification types.

**Notification Types:**

- `auction_created` - New auction posted
- `bid_placed` - Bid placed on auction
- `outbid` - User has been outbid
- `auction_won` - User won auction
- `auction_lost` - User lost auction
- `auction_cancelled` - Auction cancelled
- `bid_cancelled` - Bid cancelled

#### 5. auction_audit_logs

Comprehensive audit trail for compliance and debugging.

**Features:**

- JSON details for flexible logging
- User and auction tracking
- Action-based categorization

### Performance Views

#### active_auctions_summary

Optimized view for auction listings with:

- Creator information
- Bidding statistics
- Real-time bid counts
- Current highest bid

#### user_notifications_summary

User notification analytics with:

- Total notification counts
- Unread message counts
- Auction win statistics
- Recent activity tracking

### Database Functions

#### Core Business Functions

- `create_auction_optimized()` - Validated auction creation
- `create_bid_optimized()` - Bidding with business rules
- `close_auction_optimized()` - Auction completion
- `check_and_close_expired_auctions()` - Automated cleanup

#### Enhanced Functions

- `create_auction_fast()` - High-performance auction creation
- `place_bid_fast()` - Optimized bidding
- `get_auction_details_fast()` - Quick auction retrieval
- `get_auctions_paginated()` - Efficient pagination

#### Notification System

- `send_push_notification()` - Push notification delivery
- `create_notification_with_push()` - Combined notification creation
- `test_user_notification()` - Testing utilities

#### Maintenance Functions

- `run_auction_maintenance()` - Database maintenance
- `get_notification_system_status()` - System health checks

### Security & Performance

#### Row Level Security (RLS)

All tables have comprehensive RLS policies:

**Profiles:**

- Users can view all profiles
- Users can only edit their own profile

**Auctions:**

- Drivers see active auctions and won auctions
- Consigners see only their own auctions
- Role-based creation permissions

**Bids:**

- Users see bids for accessible auctions
- Drivers can only bid on active auctions
- Validation against own auctions

**Notifications:**

- Users see only their own notifications
- System can create notifications

#### Performance Optimizations

- 15+ strategic indexes
- Conditional indexes for better performance
- Materialized views for complex queries
- Function-based access patterns

### Migration Files

#### Current Migration Structure

```
supabase/migrations/
├── 00_init_database.sql              # Initial schema
├── 01_core_functions.sql             # Core business functions
├── 02_automation_and_notifications.sql # Notification system
├── 04_complete_database_schema.sql   # Legacy complete schema
├── 10_current_database_complete_schema.sql # Current reference schema
└── [timestamped migrations]          # Production migrations
```

#### Key Migration Files

- **00_init_database.sql** - Core table structure
- **01_core_functions.sql** - Business logic functions
- **02_automation_and_notifications.sql** - Notification system
- **10_current_database_complete_schema.sql** - Current complete reference

### Development Workflow

#### Database Updates

1. **Local Development**: Test changes locally
2. **Migration Creation**: Create timestamped migration
3. **Production Deployment**: Apply via Supabase CLI
4. **Reference Update**: Update reference schema file

### Environment Configuration

#### Required Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Monitoring & Maintenance

#### Health Checks

- Use `get_notification_system_status()` for system health
- Monitor `auction_audit_logs` for unusual activity
- Check `user_notifications_summary` for notification delivery

#### Regular Maintenance

- Run `run_auction_maintenance()` for database cleanup
- Monitor expired auctions with `check_and_close_expired_auctions()`
- Archive old audit logs periodically

### Future Enhancements

#### Planned Features

- Real-time bidding notifications
- Advanced auction scheduling
- Payment integration enhancements
- Mobile app push notification improvements

#### Database Optimizations

- Partitioning for large tables
- Advanced caching strategies
- Real-time sync optimizations

## Support & Documentation

For technical support or questions about the database schema:

1. Check the migration files for implementation details
2. Review the function definitions in `01_core_functions.sql`
3. Refer to Supabase documentation for platform-specific features
4. Use the MCP tools for database operations and queries

## Database Statistics (Current)

- **Tables**: 5 core tables
- **Views**: 2 performance views
- **Functions**: 20+ business functions
- **Indexes**: 15+ performance indexes
- **Policies**: 10+ RLS security policies
- **Vehicle Types**: 5 supported types
- **Notification Types**: 7 notification categories
