import { NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as any,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        pNumber: { label: 'P Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.pNumber || !credentials?.password) {
            return null;
          }

          // Use direct SQL query for reliability
          if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL not set');
          }
          
          const neonSql = neon(process.env.DATABASE_URL);
          const result = await neonSql`
            SELECT id, email, name, p_number, role, password_hash
            FROM users 
            WHERE p_number = ${credentials.pNumber.trim().toUpperCase()}
            LIMIT 1
          `;

          const user = result[0] as any;

          if (!user || !user.password_hash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
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
        token.role = user.role;
        token.pNumber = (user as any).pNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.pNumber = token.pNumber as string;
      }
      return session;
    },
  },
};

