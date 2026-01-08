import { pgTable, text, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users (Staff) - Extended for NextAuth
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }),
  pNumber: varchar('p_number', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('staff'), // 'staff', 'admin'
  passwordHash: text('password_hash'),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// NextAuth required tables
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: timestamp('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  (table) => ({
    compoundKey: { primaryKey: [table.identifier, table.token] },
  })
);

// IT Tickets
export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: varchar('ticket_id', { length: 50 }).notNull().unique(), // TICKET-2024-XXXXX
  requesterName: varchar('requester_name', { length: 255 }),
  requesterEmail: varchar('requester_email', { length: 255 }),
  pNumber: varchar('p_number', { length: 50 }),
  roomNumber: varchar('room_number', { length: 50 }),
  category: varchar('category', { length: 100 }),
  subject: varchar('subject', { length: 255 }),
  description: text('description').notNull(),
  urgency: varchar('urgency', { length: 20 }).notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  status: varchar('status', { length: 50 }).notNull().default('submitted'), // 'submitted', 'in_progress', 'resolved', 'closed'
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Ticket Updates/Comments
export const ticketUpdates = pgTable('ticket_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  note: text('note').notNull(),
  statusChange: varchar('status_change', { length: 50 }),
  isInternal: boolean('is_internal').default(false), // Internal staff notes
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Detentions
export const detentions = pgTable('detentions', {
  id: uuid('id').defaultRandom().primaryKey(),
  detentionId: varchar('detention_id', { length: 50 }).notNull().unique(), // DET-2024-XXXXX
  studentName: varchar('student_name', { length: 255 }).notNull(),
  studentId: varchar('student_id', { length: 50 }).notNull(),
  reason: text('reason').notNull(),
  detentionDate: timestamp('detention_date').notNull(),
  detentionTime: varchar('detention_time', { length: 10 }).notNull(), // e.g., "15:30"
  reportingStaff: varchar('reporting_staff', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'confirmed', 'attended', 'missed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Detention Updates
export const detentionUpdates = pgTable('detention_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  detentionId: uuid('detention_id').notNull().references(() => detentions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  note: text('note').notNull(),
  statusChange: varchar('status_change', { length: 50 }),
  isInternal: boolean('is_internal').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets),
  ticketUpdates: many(ticketUpdates),
  detentionUpdates: many(detentionUpdates),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
  }),
  updates: many(ticketUpdates),
}));

export const ticketUpdatesRelations = relations(ticketUpdates, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketUpdates.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketUpdates.userId],
    references: [users.id],
  }),
}));

export const detentionsRelations = relations(detentions, ({ many }) => ({
  updates: many(detentionUpdates),
}));

export const detentionUpdatesRelations = relations(detentionUpdates, ({ one }) => ({
  detention: one(detentions, {
    fields: [detentionUpdates.detentionId],
    references: [detentions.id],
  }),
  user: one(users, {
    fields: [detentionUpdates.userId],
    references: [users.id],
  }),
}));

