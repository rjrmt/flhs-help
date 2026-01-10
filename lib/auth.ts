import { NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as any,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        pNumber: { label: 'P Number', type: 'text' },
        password: { label: 'Password', type: 'password' }, // Kept for NextAuth compatibility but not used
      },
      async authorize(credentials) {
        try {
          if (!credentials?.pNumber) {
            return null;
          }

          // Use direct SQL query for reliability
          if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL not set');
          }
          
          const neonSql = neon(process.env.DATABASE_URL);
          const result = await neonSql`
            SELECT id, email, name, p_number, role
            FROM users 
            WHERE p_number = ${credentials.pNumber.trim().toUpperCase()}
            LIMIT 1
          `;

          const user = result[0] as any;

          // If user exists with this P Number, authenticate them (no password check)
          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email || user.p_number,
            name: user.name,
            role: user.role,
            pNumber: user.p_number, // Include P number in session
          };
        } catch (error: any) {
          console.error('[Auth] Error:', error.message);
          return null;
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'staff';
        token.pNumber = (user as any).pNumber || '';
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub || token.id as string || '';
        session.user.role = (token.role as string) || 'staff';
        session.user.pNumber = (token.pNumber as string) || '';
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

