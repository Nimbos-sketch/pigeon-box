import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { encryptText } from "@/lib/crypto";
import { logger } from "@/lib/logger";

async function persistGmailTokens(
  userId: string,
  email: string,
  account: { refresh_token?: string | null; access_token?: string | null; expires_at?: number | null }
) {
  if (!account.refresh_token) {
    logger.warn({ email }, "Google sign-in did not provide refresh token");
    return;
  }

  await db.gmailAccount.upsert({
    where: { userId_email: { userId, email } },
    update: {
      encryptedRefresh: encryptText(account.refresh_token),
      encryptedAccess: account.access_token ? encryptText(account.access_token) : null,
      accessExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
    },
    create: {
      userId,
      email,
      encryptedRefresh: encryptText(account.refresh_token),
      encryptedAccess: account.access_token ? encryptText(account.access_token) : null,
      accessExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
    }
  });
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/",
    error: "/auth/error"
  },
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.settings.basic"
          ].join(" ")
        }
      }
    })
  ],
  events: {
    async signIn({ user, account }) {
      if (!user.id || !user.email || !account || account.provider !== "google") {
        return;
      }
      try {
        await persistGmailTokens(user.id, user.email, account);
      } catch (error) {
        logger.error({ err: String(error), email: user.email }, "Failed to persist Gmail tokens after sign-in");
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
