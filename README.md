# FLHS IT Help Desk Hub

A modern web application for managing IT tickets and student detentions at Fort Lauderdale High School.

## 🚀 Quick Start

### 1. Environment Setup

Create `.env.local`:
```env
DATABASE_URL=postgresql://your-neon-connection-string?sslmode=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 2. Install & Setup

```bash
npm install
npm run db:generate
npx tsx scripts/apply-migration.ts
npx tsx scripts/create-admin.ts
npm run dev
```

## 📁 Project Structure

```
app/              # Next.js pages & API routes
components/       # React components
lib/              # Utilities, auth, database
scripts/          # Utility scripts
public/           # Static assets
```

## 🛠 Tech Stack

- Next.js 14 (App Router)
- Neon PostgreSQL
- Drizzle ORM
- NextAuth.js
- Tailwind CSS
- Framer Motion

## 📝 Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run db:generate` - Generate migrations
- `npx tsx scripts/create-admin.ts` - Create admin user
- `npx tsx scripts/apply-migration.ts` - Apply database migrations

## 🔐 Default Admin Credentials

- **P Number**: `P00166224`
- **Password**: `1234` (change after first login!)

## 📧 Contact

RJ Ramautar - rajesh.ramautar@browardschools.com
