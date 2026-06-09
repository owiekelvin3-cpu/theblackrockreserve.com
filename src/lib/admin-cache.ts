import { revalidateTag } from "next/cache";
import { ADMIN_NOTIFICATIONS_TAG, ADMIN_OVERVIEW_TAG } from "@/lib/admin-data";

export function invalidateAdminCaches() {
  revalidateTag(ADMIN_OVERVIEW_TAG);
  revalidateTag(ADMIN_NOTIFICATIONS_TAG);
}
