export async function destinationAfterCustomerAuth(fallback = "/dashboard") {
  try {
    const res = await fetch("/api/kyc", { credentials: "include", cache: "no-store" });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { required?: boolean; status?: string };
    if (data.required && data.status !== "VERIFIED") return "/kyc";
  } catch {
    /* stay with dashboard; layout will redirect if needed */
  }
  return fallback;
}
