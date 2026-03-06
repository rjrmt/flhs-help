# Supabase Database & IT Tickets

## Table Mapping

The IT Ticket Console uses the **`tickets`** table. Your Supabase project also has an **`it_tickets`** table (from Microsoft List / SharePoint sync) with different column names.

| App (tickets)     | it_tickets (legacy) |
|------------------|----------------------|
| ticket_id        | legacy_ticket_id     |
| requester_name   | staff_name           |
| room_number      | building + room_number |
| description      | issue_description   |
| status           | status               |
| urgency          | urgency              |
| created_at       | submitted_at         |
| updated_at       | updated_at           |

## Migration

To copy data from `it_tickets` into `tickets` (so they appear in the IT Ticket Console):

```bash
npx tsx scripts/migrate-it-tickets-to-tickets.ts
```

This script:
- Skips tickets already in `tickets`
- Maps status (closed → resolved, etc.)
- Maps urgency (1_2_days → high, etc.)
- Combines building + room into `room_number`

## Schema Check

To verify tables and ticket counts:

```bash
npm run db:check
```

## Required Tables

- **tickets** – IT tickets (used by IT Ticket Console)
- **ticket_updates** – Comments/updates on tickets
- **users** – Staff accounts (NextAuth)
- **staff_roster** – P# lookup for ticket submission
- **student_roster** – 06# lookup for ticket submission
