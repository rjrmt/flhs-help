# FLHS IT Help Desk Hub

A modern, portfolio-worthy web application for managing IT tickets and student detentions at Fort Lauderdale High School. Built with Next.js 14, Neon PostgreSQL, and Tailwind CSS.

## Features

### Public Features
- **Submit IT Tickets** - Students and staff can submit IT support tickets with detailed information
- **Report Detentions** - Staff can report student detentions with all relevant details
- **Status Checker** - Public lookup to check the status of tickets or detentions using their ID

### Staff Features (Authenticated)
- **Staff Dashboard** - Overview with statistics and recent tickets/detentions
- **Ticket Management** - View, filter, and manage all IT tickets
- **Detention Management** - View, filter, and manage all student detentions
- **Update System** - Add notes and update status for tickets and detentions
- **Internal Notes** - Staff-only notes not visible to requesters

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Neon PostgreSQL database account
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd flhs-help
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Generate a `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

4. Set up the database:

Generate migration files:
```bash
npm run db:generate
```

Apply migrations:
```bash
npm run db:migrate
```

(Note: You may need to run migrations manually in your Neon dashboard initially)

5. Create an admin user:

You'll need to create a staff user manually in the database or through Drizzle Studio:
```bash
npm run db:studio
```

Hash a password using bcrypt and insert a user record.

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
flhs-help/
├── app/
│   ├── (public)/              # Public routes
│   │   ├── page.tsx          # Home page
│   │   ├── submit-ticket/    # Ticket submission
│   │   ├── report-detention/ # Detention reporting
│   │   └── status/           # Status checker
│   ├── (staff)/              # Protected staff routes
│   │   └── dashboard/        # Staff dashboard
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth
│   │   ├── tickets/          # Ticket API
│   │   └── detentions/       # Detention API
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/               # React components
│   ├── ui/                   # Reusable UI components
│   └── forms/                # Form components
├── lib/                      # Utilities and config
│   ├── db/                   # Database schema and client
│   ├── auth.ts               # NextAuth configuration
│   └── utils/                # Helper functions
└── types/                    # TypeScript types
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - Staff members with authentication
- `tickets` - IT support tickets
- `ticket_updates` - Updates and notes on tickets
- `detentions` - Student detentions
- `detention_updates` - Updates and notes on detentions

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app will automatically run database migrations on first deploy (if configured).

## Design System

The application uses a modern dark theme with:
- **Primary Color**: Neon Blue (#2e00df)
- **Background**: Black (#000000)
- **Surface**: Dark Gray (#0a0a0a to #1a1a1a)
- **Liquid Design**: Animated gradient blobs and glassmorphism effects

## License

This project is a portfolio piece and donation app for Fort Lauderdale High School.

## Contact

RJ Ramautar - (954) 804-6428

