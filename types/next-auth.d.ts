import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      pNumber?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    pNumber?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    pNumber?: string;
  }
}

