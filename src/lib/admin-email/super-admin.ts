/** Super admin = primary admin email from env (broadcast permission). */
export function isSuperAdmin(email: string | null | undefined): boolean {
  const primary = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!primary || !email) return false;
  return email.trim().toLowerCase() === primary;
}

export function getSuperAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim() || null;
}
