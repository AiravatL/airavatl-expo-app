# API Functions Documentation

## Database Functions Reference

This document provides comprehensive documentation for all database functions available in the Airavatl auction platform.

## Core Business Functions

### 1. Auction Management

#### `create_auction_optimized()`

Creates a new auction with comprehensive validation.

```sql
create_auction_optimized(
    p_title text,
    p_description text,
    p_vehicle_type text,
    p_start_time timestamptz,
    p_end_time timestamptz,
    p_consignment_date timestamptz,
    p_created_by uuid
) RETURNS uuid
```

**Parameters:**

- `p_title`: Auction title (required)
- `p_description`: Detailed description (required)
- `p_vehicle_type`: Must be valid vehicle type
- `p_start_time`: Auction start timestamp
- `p_end_time`: Auction end timestamp
- `p_consignment_date`: Pickup/delivery date
- `p_created_by`: Creator's user ID

**Validation:**

- User must be a consigner
- End time must be after start time
- Duration between 5 minutes and 7 days
- Valid vehicle type required

**Returns:** New auction ID (uuid)

#### `close_auction_optimized()`

Closes an auction and determines the winner.

```sql
close_auction_optimized(p_auction_id uuid) RETURNS jsonb
```

**Parameters:**

- `p_auction_id`: ID of auction to close

**Business Logic:**

- Finds lowest bid (reverse auction)
- Updates auction status to 'completed'
- Sets winner and winning bid
- Creates notifications for all participants
- Logs activity for audit trail

**Returns:** JSON response with success status and message

### 2. Bidding System

#### `create_bid_optimized()`

Places a bid with comprehensive validation.

```sql
create_bid_optimized(
    p_auction_id uuid,
    p_user_id uuid,
    p_amount numeric
) RETURNS jsonb
```

**Parameters:**

- `p_auction_id`: Target auction ID
- `p_user_id`: Bidder's user ID
- `p_amount`: Bid amount (must be positive)

**Validation:**

- Auction must be active and not expired
- User must be a driver
- User cannot bid on own auction
- Amount must be positive

**Business Logic:**

- Upserts bid (updates if same amount exists)
- Updates winning bid status
- Creates notifications for outbid users
- Logs bid activity

**Returns:** JSON response with success status

#### `place_bid_fast()`

High-performance bidding function for mobile apps.

```sql
place_bid_fast(
    p_auction_id uuid,
    p_bid_amount numeric
) RETURNS jsonb
```

**Features:**

- Uses current authenticated user
- Optimized for mobile performance
- Reduced validation overhead
- Fast response times

### 3. Enhanced Functions

#### `create_auction_fast()`

High-performance auction creation.

```sql
create_auction_fast(auction_data jsonb) RETURNS jsonb
```

**Parameters:**

- `auction_data`: JSON object with auction details

**Benefits:**

- Single JSON parameter for mobile apps
- Bulk validation
- Optimized performance
- Standardized response format

#### `get_auction_details_fast()`

Optimized auction detail retrieval.

```sql
get_auction_details_fast(p_auction_id uuid) RETURNS jsonb
```

**Returns:**

- Complete auction information
- Creator details
- Current bidding statistics
- Formatted for mobile consumption

#### `get_auctions_paginated()`

Efficient auction listing with filters.

```sql
get_auctions_paginated(
    p_status text DEFAULT 'active',
    p_vehicle_type text DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0,
    p_user_role text DEFAULT NULL
) RETURNS jsonb
```

**Features:**

- Pagination support
- Multiple filter options
- Role-based filtering
- Performance optimized

## User Management Functions

### `get_user_auctions_optimized()`

Retrieves user's auctions with pagination.

```sql
get_user_auctions_optimized(
    p_user_id uuid,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
) RETURNS jsonb
```

**Returns:**

- User's created auctions (if consigner)
- User's bid auctions (if driver)
- Won auctions
- Pagination metadata

## Notification System

### `create_notification_with_push()`

Creates notification and sends push notification.

```sql
create_notification_with_push(
    p_user_id uuid,
    p_auction_id uuid,
    p_type text,
    p_message text,
    p_data jsonb DEFAULT '{}'
) RETURNS uuid
```

**Features:**

- Database notification creation
- Push notification delivery
- Error handling
- Audit logging

### `send_push_notification()`

Sends push notification via HTTP.

```sql
send_push_notification(
    p_user_id uuid,
    p_title text,
    p_body text,
    p_data jsonb DEFAULT '{}'
) RETURNS boolean
```

**Implementation:**

- Uses HTTP extension
- Expo Push Notification service
- Token validation
- Delivery confirmation

### `test_user_notification()`

Testing utility for notifications.

```sql
test_user_notification(
    p_user_id uuid,
    p_test_message text DEFAULT 'Test notification'
) RETURNS jsonb
```

## Maintenance Functions

### `run_auction_maintenance()`

Comprehensive database maintenance.

```sql
run_auction_maintenance() RETURNS jsonb
```

**Operations:**

- Closes expired auctions
- Updates winning bids
- Sends pending notifications
- Cleans up old data
- Performance statistics

### `check_and_close_expired_auctions()`

Automated auction expiration handling.

```sql
check_and_close_expired_auctions() RETURNS integer
```

**Returns:** Number of auctions closed

### `get_notification_system_status()`

System health check for notifications.

```sql
get_notification_system_status() RETURNS jsonb
```

**Returns:**

- Notification delivery statistics
- System performance metrics
- Error counts and rates
- Health status indicators

## Cancellation Functions

### `cancel_auction_by_consigner()`

Allows consigner to cancel their auction.

```sql
cancel_auction_by_consigner(
    p_auction_id uuid,
    p_user_id uuid
) RETURNS jsonb
```

**Validation:**

- User must be auction creator
- Auction must be active
- No bids placed (optional business rule)

### `cancel_bid_by_driver()`

Allows driver to cancel their bid.

```sql
cancel_bid_by_driver(
    p_bid_id uuid,
    p_user_id uuid
) RETURNS jsonb
```

**Business Logic:**

- Validates bid ownership
- Updates winning bid if necessary
- Creates notifications
- Logs activity

## Utility Functions

### `log_auction_activity()`

Creates audit log entries.

```sql
log_auction_activity(
    p_auction_id uuid,
    p_user_id uuid,
    p_action text,
    p_details jsonb DEFAULT '{}'
) RETURNS uuid
```

**Usage:**

- Automatic logging in business functions
- Manual logging for special events
- Compliance and debugging

### `create_auction_notification()`

Basic notification creation.

```sql
create_auction_notification(
    p_user_id uuid,
    p_auction_id uuid,
    p_type text,
    p_message text,
    p_data jsonb DEFAULT '{}'
) RETURNS uuid
```

## Function Usage Examples

### TypeScript Integration

```typescript
// Create auction
const { data, error } = await supabase.rpc('create_auction_fast', {
  auction_data: {
    title: 'Truck Transport',
    description: 'Heavy machinery transport',
    vehicle_type: 'large_truck',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    consignment_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
  },
});

// Place bid
const { data: bidResult } = await supabase.rpc('place_bid_fast', {
  p_auction_id: 'auction-uuid',
  p_bid_amount: 5000,
});

// Get paginated auctions
const { data: auctions } = await supabase.rpc('get_auctions_paginated', {
  p_status: 'active',
  p_vehicle_type: 'three_wheeler',
  p_limit: 10,
  p_offset: 0,
});
```

### Error Handling

```typescript
const handleAuctionCreate = async (auctionData: any) => {
  try {
    const { data, error } = await supabase.rpc('create_auction_fast', {
      auction_data: auctionData,
    });

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      console.error('Business logic error:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true, auction_id: data.auction_id };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
};
```

## Performance Considerations

### Function Optimization

- Use `SECURITY DEFINER` for elevated privileges
- Set `search_path = public` to prevent hijacking
- Minimize database roundtrips
- Use bulk operations where possible

### Caching Strategy

- Cache frequently accessed auction data
- Use views for complex queries
- Implement client-side caching
- Consider Redis for real-time data

### Monitoring

- Track function execution times
- Monitor error rates
- Log performance metrics
- Set up alerts for anomalies

## Best Practices

### Function Development

1. **Input Validation**: Always validate parameters
2. **Error Handling**: Return consistent error formats
3. **Security**: Use RLS and function security
4. **Performance**: Optimize queries and indexes
5. **Logging**: Include audit trails

### API Integration

1. **Type Safety**: Use TypeScript types
2. **Error Handling**: Handle all error cases
3. **Retry Logic**: Implement for transient failures
4. **Caching**: Cache appropriate responses
5. **Testing**: Unit test all function calls

### Maintenance

1. **Monitoring**: Track function performance
2. **Updates**: Test thoroughly before deployment
3. **Documentation**: Keep this guide updated
4. **Backup**: Ensure function definitions are backed up
5. **Security**: Regular security reviews
