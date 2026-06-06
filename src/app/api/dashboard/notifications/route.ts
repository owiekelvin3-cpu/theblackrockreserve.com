import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
} from "@/lib/user-notifications";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const sinceParam = req.nextUrl.searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : undefined;
    const validSince = since && !Number.isNaN(since.getTime()) ? since : undefined;

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(userId, 20, validSince),
      getUnreadNotificationCount(userId),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("User notifications GET error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : undefined;
    await markNotificationsRead(userId, ids);
    const unreadCount = await getUnreadNotificationCount(userId);
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error("User notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
