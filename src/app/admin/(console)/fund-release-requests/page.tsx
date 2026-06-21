import { redirect } from "next/navigation";

export default function FundReleaseRequestsRedirectPage() {
  redirect("/admin/frozen-accounts?tab=releases");
}
