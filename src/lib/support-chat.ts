import { prisma } from "@/lib/prisma";

export type SupportMessageDto = {
  id: string;
  role: "USER" | "ADMIN" | "SYSTEM";
  content: string;
  createdAt: string;
  adminName?: string;
};

export type SupportConversationSummary = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  adminUnread: boolean;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
};

function mapMessage(m: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  admin?: { name: string } | null;
}): SupportMessageDto {
  return {
    id: m.id,
    role: m.role as SupportMessageDto["role"],
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    adminName: m.admin?.name,
  };
}

export async function getUserSupportConversation(userId: string) {
  const conversation = await prisma.supportConversation.findUnique({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { admin: { select: { name: true } } },
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    status: conversation.status,
    userHasUnreadReply: conversation.userHasUnreadReply,
    messages: conversation.messages.map(mapMessage),
  };
}

export async function markSupportRepliesRead(userId: string) {
  await prisma.supportConversation.updateMany({
    where: { userId, userHasUnreadReply: true },
    data: { userHasUnreadReply: false },
  });
}

export async function sendUserSupportMessage(userId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  let conversation = await prisma.supportConversation.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!conversation) {
    conversation = await prisma.supportConversation.create({
      data: {
        userId,
        adminUnread: true,
        messages: {
          create: {
            role: "SYSTEM",
            content:
              "Your message has been received by our client services team. A specialist will review your request and respond here within 24–48 business hours (Monday–Friday, excluding U.S. bank holidays).",
          },
        },
      },
      select: { id: true },
    });
  }

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: trimmed,
      },
    }),
    prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        adminUnread: true,
        updatedAt: new Date(),
      },
    }),
  ]);

  return getUserSupportConversation(userId);
}

export async function getAdminSupportConversations() {
  try {
    const conversations = await prisma.supportConversation.findMany({
      where: {
        messages: { some: { role: "USER" } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: {
          where: { role: { in: ["USER", "ADMIN"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, role: true },
        },
        _count: { select: { messages: true } },
      },
    });

    return conversations.map((c): SupportConversationSummary => ({
      id: c.id,
      userId: c.user.id,
      userName: c.user.name,
      userEmail: c.user.email,
      status: c.status,
      adminUnread: c.adminUnread,
      lastMessage: c.messages[0]?.content ?? "",
      lastMessageAt: (c.messages[0]?.createdAt ?? c.updatedAt).toISOString(),
      messageCount: c._count.messages,
    }));
  } catch (error) {
    console.error("Support conversations unavailable:", error);
    return [];
  }
}

export async function getAdminSupportConversation(id: string) {
  try {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { admin: { select: { name: true } } },
        },
      },
    });

    if (!conversation) return null;

    if (conversation.adminUnread) {
      await prisma.supportConversation.update({
        where: { id },
        data: { adminUnread: false },
      });
    }

    return {
      id: conversation.id,
      status: conversation.status,
      adminUnread: false,
      user: conversation.user,
      messages: conversation.messages.map(mapMessage),
    };
  } catch (error) {
    console.error("getAdminSupportConversation error:", error);
    return null;
  }
}

export async function sendAdminSupportReply(
  conversationId: string,
  adminId: string,
  content: string
) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Reply cannot be empty");

  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId: true, status: true },
  });

  if (!conversation) throw new Error("Conversation not found");
  if (conversation.status === "CLOSED") throw new Error("Conversation is closed");

  const messageData = {
    conversationId,
    role: "ADMIN" as const,
    content: trimmed,
    adminId,
  };

  try {
    await prisma.$transaction([
      prisma.supportMessage.create({ data: messageData }),
      prisma.supportConversation.update({
        where: { id: conversationId },
        data: {
          userHasUnreadReply: true,
          updatedAt: new Date(),
        },
      }),
    ]);
  } catch (error) {
    console.error("Admin reply with adminId failed, retrying without link:", error);
    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          conversationId,
          role: "ADMIN",
          content: trimmed,
        },
      }),
      prisma.supportConversation.update({
        where: { id: conversationId },
        data: {
          userHasUnreadReply: true,
          updatedAt: new Date(),
        },
      }),
    ]);
  }

  return getAdminSupportConversation(conversationId);
}

export async function getUnreadSupportConversationCount() {
  return prisma.supportConversation.count({ where: { adminUnread: true } });
}
