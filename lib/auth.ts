import { NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

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

          const [user] = await db
            .select({ id: users.id, email: users.email, name: users.name, pNumber: users.pNumber, role: users.role })
            .from(users)
            .where(eq(users.pNumber, credentials.pNumber.trim().toUpperCase()))
            .limit(1);

          // If user exists with this P Number, authenticate them (no password check)
          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email || user.pNumber,
            name: user.name,
            role: user.role,
            pNumber: user.pNumber,
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

