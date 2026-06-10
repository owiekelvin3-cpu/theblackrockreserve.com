import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: "USER" | "ADMIN";
      emailVerified: boolean;
    };
  }

  interface User {
    role?: "USER" | "ADMIN";
    emailVerified?: boolean;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    emailVerified: boolean;
  }
}
