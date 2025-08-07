# Security & Best Practices

## Database Security Implementation

### Row Level Security (RLS) Policies

#### Current Security Model

All tables have RLS enabled with comprehensive policies:

```sql
-- Example: Auction visibility policy
CREATE POLICY "Drivers view active auctions" ON auctions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'driver'
        AND (auctions.status = 'active' OR auctions.winner_id = auth.uid())
    )
);
```

#### Security Layers

1. **Authentication**: Supabase Auth handles user authentication
2. **Authorization**: RLS policies enforce role-based access
3. **Validation**: CHECK constraints ensure data integrity
4. **Audit**: Complete audit trail for compliance

### Role-Based Access Control

#### Consigner Permissions

- ✅ Create auctions
- ✅ View own auctions
- ✅ Cancel own auctions
- ✅ Receive notifications
- ❌ Place bids
- ❌ View other consigners' auctions

#### Driver Permissions

- ✅ View active auctions
- ✅ Place bids on auctions
- ✅ View won auctions
- ✅ Cancel own bids
- ✅ Receive notifications
- ❌ Create auctions
- ❌ View inactive auctions (unless won)

### Data Validation & Constraints

#### Input Validation

```sql
-- Phone number validation
CHECK (phone_number ~ '^[0-9]{10}$')

-- UPI ID validation
CHECK (upi_id ~ '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$')

-- Positive bid amounts
CHECK (amount > 0)

-- Auction duration limits
CHECK (
    end_time - start_time >= interval '5 minutes' AND
    end_time - start_time <= interval '7 days'
)
```

#### Enum Constraints

- Vehicle types limited to approved values
- Notification types controlled
- Auction statuses restricted
- User roles enforced

### API Security Best Practices

#### Function Security

```sql
-- Security definer functions with controlled access
CREATE OR REPLACE FUNCTION create_auction_optimized(...)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges
SET search_path = public  -- Prevents schema hijacking
AS $$
```

#### Error Handling

- Graceful error responses
- No sensitive data in error messages
- Consistent error format
- Audit trail for failed operations

### Performance Security

#### Query Optimization

- Indexes prevent table scans
- Views limit data exposure
- Functions encapsulate complex logic
- Pagination prevents data dumps

#### Resource Protection

- Row limits in queries
- Timeout protections
- Connection pooling
- Rate limiting (application layer)

## Security Recommendations

### 1. Environment Security

```bash
# Use environment variables for secrets
EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Never commit secrets to version control
echo "*.env*" >> .gitignore
```

### 2. API Key Management

- Use anon key for client-side operations
- Service key only for server-side operations
- Rotate keys regularly
- Monitor key usage

### 3. Client-Side Security

```typescript
// Validate data before sending to API
const validateAuction = (data: AuctionData) => {
  if (!data.title?.trim()) throw new Error('Title required');
  if (!data.description?.trim()) throw new Error('Description required');
  if (new Date(data.end_time) <= new Date())
    throw new Error('Invalid end time');
};

// Use TypeScript for type safety
const createAuction = async (auction: TablesInsert<'auctions'>) => {
  // Type-safe database operations
};
```

### 4. Real-time Security

```typescript
// Secure real-time subscriptions
const subscription = supabase
  .channel('auctions')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'auctions',
      filter: 'status=eq.active', // Only active auctions
    },
    handleAuctionUpdate
  )
  .subscribe();
```

### 5. Audit & Monitoring

#### Security Monitoring

```sql
-- Monitor failed authentication attempts
SELECT COUNT(*)
FROM auth.audit_log_entries
WHERE created_at > now() - interval '1 hour'
AND payload->>'error_message' IS NOT NULL;

-- Check for unusual activity patterns
SELECT user_id, COUNT(*) as actions
FROM auction_audit_logs
WHERE created_at > now() - interval '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 100;  -- Suspicious activity threshold
```

#### Compliance Logging

- All user actions logged
- Data access tracked
- Security events recorded
- Retention policies enforced

### 6. Push Notification Security

```sql
-- Secure push notification function
CREATE OR REPLACE FUNCTION send_push_notification(
    p_user_id uuid,
    p_title text,
    p_body text,
    p_data jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate user exists and has push token
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id AND push_token IS NOT NULL
    ) THEN
        RETURN false;
    END IF;

    -- Send notification via HTTP (secure endpoint)
    -- Implementation details...

    RETURN true;
END;
$$;
```

## Security Checklist

### Database Level

- [ ] RLS enabled on all tables
- [ ] Comprehensive security policies
- [ ] Input validation constraints
- [ ] Audit logging implemented
- [ ] Regular security updates

### Application Level

- [ ] Environment variables secured
- [ ] API keys protected
- [ ] Client-side validation
- [ ] Error handling implemented
- [ ] Type safety enforced

### Infrastructure Level

- [ ] HTTPS enforced
- [ ] Database backups secured
- [ ] Access logs monitored
- [ ] Security headers configured
- [ ] Rate limiting enabled

### Monitoring & Response

- [ ] Security alerts configured
- [ ] Incident response plan
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Compliance reviews

## Incident Response

### Security Breach Response

1. **Immediate**: Revoke compromised credentials
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze audit logs
5. **Recovery**: Restore secure operations
6. **Post-mortem**: Update security measures

### Data Breach Protocol

1. **Detection**: Automated monitoring alerts
2. **Classification**: Determine data sensitivity
3. **Notification**: Follow legal requirements
4. **Remediation**: Secure exposed data
5. **Prevention**: Enhance security controls

## Regular Security Tasks

### Daily

- Monitor security alerts
- Review failed login attempts
- Check system health metrics

### Weekly

- Audit user permissions
- Review access logs
- Update security documentation

### Monthly

- Security vulnerability assessment
- Review and rotate API keys
- Update security policies

### Quarterly

- Comprehensive security audit
- Penetration testing
- Security training updates
- Compliance review

## Security Contacts

### Internal Team

- **Database Admin**: Review RLS policies
- **DevOps Team**: Infrastructure security
- **Development Team**: Application security

### External Resources

- **Supabase Support**: Platform security issues
- **Security Consultant**: Regular audits
- **Compliance Officer**: Regulatory requirements
