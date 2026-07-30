import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatReply } from "@/lib/chatbot";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";

const chatSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000),
  pathname: z.string().max(200).optional(),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "bot"]),
        content: z.string().max(2000),
      })
    )
    .max(8)
    .optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) ?? "anonymous";
    const limited = checkRateLimit(`chat:${ip}`, 30, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid message" },
        { status: 400 }
      );
    }

    const reply = getChatReply(parsed.data.message, {
      pathname: parsed.data.pathname,
      recentMessages: parsed.data.recentMessages,
    });
    return NextResponse.json(reply);
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
