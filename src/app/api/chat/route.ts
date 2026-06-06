import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatReply } from "@/lib/chatbot";

const chatSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid message" },
        { status: 400 }
      );
    }

    const reply = getChatReply(parsed.data.message);
    return NextResponse.json(reply);
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
