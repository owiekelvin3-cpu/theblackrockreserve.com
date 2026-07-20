import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { stripJwtBloat } from "@/lib/cookie-audit";

function isTransientDbError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("connection pool") ||
    message.includes("P2024") ||
    message.includes("P1001") ||
    message.includes("Timed out fetching") ||
    message.includes("statement timeout") ||
    message.includes("57014") ||
    message.includes("Can't reach database")
  );
}

async function findLoginUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          emailVerified: true,
          status: true,
        },
      });
    } catch (error) {
      if (!isTransientDbError(error) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }

  return null;
}

/**
 * JWT session cookie must stay small (<4 KB). Only store auth primitives.
 * Profile images, settings, and user data belong in the database.
 *
 * Google OAuth is intentionally disabled until account linking + DB user
 * provisioning are implemented (partial OAuth sessions break dashboard APIs).
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Invalid credentials");
        }

        if (!credentials.password) {
          throw new Error("Invalid credentials");
        }

        let user;
        try {
          user = await findLoginUser(credentials.email);
        } catch (error) {
          if (isTransientDbError(error)) {
            console.error("[auth] Database timeout during login:", error);
            throw new Error("Sign-in is temporarily busy. Please wait a moment and try again.");
          }
          console.error("[auth] Database error during login:", error);
          throw new Error("Unable to sign in right now. Please try again shortly.");
        }

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        if (user.role === "ADMIN" && process.env.ADMIN_STRICT_EMAIL === "true") {
          const allowedAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
          if (allowedAdmin && user.email.toLowerCase() !== allowedAdmin) {
            throw new Error("Invalid credentials");
          }
        }

        if (user.status === "SUSPENDED") {
          throw new Error("Your account has been suspended. Contact support.");
        }

        if (!user.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date(), otpCode: null, otpExpires: null },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    /** Avoid re-encoding JWT on every request (was 0 — caused excess cookie churn) */
    updateAge: 24 * 60 * 60,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.callback-url"
          : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.emailVerified = Boolean(user.emailVerified);
      } else if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true, emailVerified: true, status: true },
        });
        if (!dbUser || dbUser.status === "SUSPENDED") {
          // Invalidate privileged claims; next request will fail auth guards.
          token.id = "";
          token.role = "USER";
          token.emailVerified = false;
          return stripJwtBloat(token as Record<string, unknown>) as typeof token;
        }
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.emailVerified = !!dbUser.emailVerified;
      }

      return stripJwtBloat(token as Record<string, unknown>) as typeof token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
        session.user.emailVerified = Boolean(token.emailVerified);
        // Profile image is loaded from /api/dashboard/profile/image — never from cookie
        session.user.image = null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
