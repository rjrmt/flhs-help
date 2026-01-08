# Security & Privacy Documentation

## ✅ Data Storage

**All data is stored securely in Neon PostgreSQL database:**
- ✅ Tickets saved to `tickets` table
- ✅ Detentions saved to `detentions` table
- ✅ Users saved to `users` table with encrypted passwords
- ✅ All data is private and only accessible through authenticated API endpoints

## 🔒 Authentication & Authorization

### Authentication Required
- ✅ Staff dashboard pages require login
- ✅ Admin console requires login
- ✅ API endpoints for listing tickets/detentions require authentication
- ✅ API endpoints for updating tickets/detentions require authentication

### User-Based Access Control
- ✅ **Staff users** see only their own tickets/detentions (filtered by P Number)
- ✅ **Admin users** see all tickets/detentions
- ✅ Data filtering happens at the database query level

### Public Endpoints (Intentionally Public)
The following endpoints are public for status checking functionality:
- `GET /api/tickets?ticketId=XXX` - Public ticket status lookup
- `GET /api/detentions?detentionId=XXX` - Public detention status lookup

These allow users to check status without logging in using their ticket/detention ID.

## 🔐 Password Security

- ✅ Passwords are hashed using bcrypt
- ✅ Password hashes are stored in database (never plain text)
- ✅ Default passwords should be changed on first login

## 🛡️ API Security

### Protected Endpoints

**Requires Authentication:**
- `GET /api/tickets` (list all) - Requires auth, filtered by user
- `GET /api/detentions` (list all) - Requires auth, filtered by user
- `GET /api/tickets/[id]` - Requires auth
- `GET /api/detentions/[id]` - Requires auth
- `PATCH /api/tickets/[id]` - Requires auth
- `PATCH /api/detentions/[id]` - Requires auth

**Public Endpoints (for status checking):**
- `GET /api/tickets?ticketId=XXX` - Public lookup by ticket ID
- `GET /api/detentions?detentionId=XXX` - Public lookup by detention ID
- `POST /api/tickets` - Public submission (anyone can submit ticket)
- `POST /api/detentions` - Public submission (anyone can submit detention)

### Data Filtering

**Staff Users:**
- API returns only tickets/detentions where `p_number` matches logged-in user
- Filtering happens at database query level (secure)

**Admin Users:**
- API returns all tickets/detentions
- No filtering applied

## 🔐 Database Security

- ✅ Connection uses SSL/TLS (via Neon)
- ✅ Database URL stored in environment variables (never in code)
- ✅ Connection string requires SSL mode
- ✅ Passwords encrypted with bcrypt (10 rounds)

## 📊 Privacy

- ✅ User data (P numbers, names, emails) stored securely
- ✅ Ticket data linked to P numbers for filtering
- ✅ Detention data linked to P numbers for filtering
- ✅ Internal notes marked with `isInternal` flag
- ✅ Public status lookups only show non-internal updates

## ✅ Best Practices Implemented

1. **Authentication Required** - All sensitive endpoints require login
2. **User-Based Filtering** - Staff only see their own data
3. **Password Hashing** - bcrypt with 10 rounds
4. **Environment Variables** - Sensitive data in `.env.local`
5. **Database SSL** - Encrypted connections to Neon
6. **Input Validation** - Zod schemas validate all inputs
7. **SQL Injection Protection** - Using parameterized queries (Drizzle ORM)

## 🚨 Security Recommendations

1. **Change Default Passwords** - All imported teachers should change passwords
2. **HTTPS in Production** - Ensure production uses HTTPS
3. **Rate Limiting** - Consider adding rate limiting to public endpoints
4. **Audit Logging** - Consider logging all data access
5. **Regular Updates** - Keep dependencies updated
6. **Backup Strategy** - Regular database backups recommended

## 🔍 Security Checklist

- ✅ Passwords hashed (bcrypt)
- ✅ Authentication required for sensitive endpoints
- ✅ User-based data filtering
- ✅ SSL database connections
- ✅ Environment variables for secrets
- ✅ Input validation (Zod)
- ✅ SQL injection protection (ORM)
- ⚠️ Rate limiting (not yet implemented)
- ⚠️ Audit logging (not yet implemented)

## 📝 Notes

- Public ticket/detention submission is intentional for ease of use
- Status lookup by ID is public by design (for status checking page)
- All data is stored in Neon PostgreSQL (private cloud database)
- Database access is restricted to your application only

