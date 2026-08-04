import { prisma } from "@/lib/prisma";
import {
  formatSupportAttachmentLabel,
  type ValidatedSupportAttachment,
} from "@/lib/support-attachment";

export type SupportMessageDto = {
  id: string;
  role: "USER" | "ADMIN" | "SYSTEM";
  content: string;
  createdAt: string;
  adminName?: string;
  attachment?: {
    name: string;
    mime: string;
    dataUrl: string;
    kind: "image" | "document" | "file";
    /** Present when attachment exists but blob was omitted from the list payload. */
    lazy?: boolean;
  } | null;
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

function mapMessage(
  m: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    attachmentData?: string | null;
    admin?: { name: string } | null;
  },
  options?: { includeAttachmentData?: boolean }
): SupportMessageDto {
  const includeAttachmentData = options?.includeAttachmentData ?? false;
  const attachment =
    m.attachmentName && m.attachmentMime
      ? {
          name: m.attachmentName,
          mime: m.attachmentMime,
          dataUrl: includeAttachmentData && m.attachmentData ? m.attachmentData : "",
          lazy: !includeAttachmentData && Boolean(m.attachmentName),
          kind: (m.attachmentMime.startsWith("image/")
            ? "image"
            : m.attachmentMime.includes("pdf") ||
                m.attachmentMime.includes("word") ||
                m.attachmentMime.includes("sheet") ||
                m.attachmentMime.startsWith("text/")
              ? "document"
              : "file") as "image" | "document" | "file",
        }
      : null;

  return {
    id: m.id,
    role: m.role as SupportMessageDto["role"],
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    adminName: m.admin?.name,
    attachment,
  };
}

function previewContent(content: string, attachment?: ValidatedSupportAttachment | null) {
  const trimmed = content.trim();
  if (trimmed) return trimmed;
  if (attachment) return formatSupportAttachmentLabel(attachment.name, attachment.mime);
  return "";
}

export async function getUserSupportConversation(
  userId: string,
  options?: { includeAttachmentData?: boolean }
) {
  const includeAttachmentData = options?.includeAttachmentData ?? false;
  const messageSelect = {
    id: true,
    role: true,
    content: true,
    createdAt: true,
    attachmentName: true,
    attachmentMime: true,
    admin: { select: { name: true } },
    ...(includeAttachmentData ? { attachmentData: true as const } : {}),
  };
  const conversation = await prisma.supportConversation.findUnique({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: messageSelect,
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    status: conversation.status,
    userHasUnreadReply: conversation.userHasUnreadReply,
    messages: conversation.messages.map((m) => mapMessage(m, { includeAttachmentData })),
  };
}

export async function markSupportRepliesRead(userId: string) {
  await prisma.supportConversation.updateMany({
    where: { userId, userHasUnreadReply: true },
    data: { userHasUnreadReply: false },
  });
}

export async function sendUserSupportMessage(
  userId: string,
  content: string,
  attachment?: ValidatedSupportAttachment | null
) {
  const trimmed = content.trim();
  if (!trimmed && !attachment) throw new Error("Message cannot be empty");

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

  const storedContent = previewContent(trimmed, attachment);

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: storedContent,
        attachmentName: attachment?.name,
        attachmentMime: attachment?.mime,
        attachmentData: attachment?.dataUrl,
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

  return getUserSupportConversation(userId, { includeAttachmentData: true });
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
          select: {
            content: true,
            createdAt: true,
            role: true,
            attachmentName: true,
            attachmentMime: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });

    return conversations.map((c): SupportConversationSummary => {
      const last = c.messages[0];
      const lastMessage = last
        ? last.content ||
          (last.attachmentName
            ? formatSupportAttachmentLabel(last.attachmentName, last.attachmentMime)
            : "")
        : "";
      return {
        id: c.id,
        userId: c.user.id,
        userName: c.user.name,
        userEmail: c.user.email,
        status: c.status,
        adminUnread: c.adminUnread,
        lastMessage,
        lastMessageAt: (last?.createdAt ?? c.updatedAt).toISOString(),
        messageCount: c._count.messages,
      };
    });
  } catch (error) {
    console.error("Support conversations unavailable:", error);
    return [];
  }
}

export async function getAdminSupportConversation(
  id: string,
  options?: { includeAttachmentData?: boolean }
) {
  const includeAttachmentData = options?.includeAttachmentData ?? false;
  const messageSelect = {
    id: true,
    role: true,
    content: true,
    createdAt: true,
    attachmentName: true,
    attachmentMime: true,
    admin: { select: { name: true } },
    ...(includeAttachmentData ? { attachmentData: true as const } : {}),
  };
  try {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: messageSelect,
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
      messages: conversation.messages.map((m) => mapMessage(m, { includeAttachmentData })),
    };
  } catch (error) {
    console.error("getAdminSupportConversation error:", error);
    return null;
  }
}

export async function sendAdminSupportReply(
  conversationId: string,
  adminId: string,
  content: string,
  attachment?: ValidatedSupportAttachment | null
) {
  const trimmed = content.trim();
  if (!trimmed && !attachment) throw new Error("Reply cannot be empty");

  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId: true, status: true },
  });

  if (!conversation) throw new Error("Conversation not found");
  if (conversation.status === "CLOSED") throw new Error("Conversation is closed");

  const storedContent = previewContent(trimmed, attachment);
  const messageData = {
    conversationId,
    role: "ADMIN" as const,
    content: storedContent,
    adminId,
    attachmentName: attachment?.name,
    attachmentMime: attachment?.mime,
    attachmentData: attachment?.dataUrl,
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
          content: storedContent,
          attachmentName: attachment?.name,
          attachmentMime: attachment?.mime,
          attachmentData: attachment?.dataUrl,
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

  return getAdminSupportConversation(conversationId, { includeAttachmentData: true });
}

export async function getSupportMessageAttachmentForUser(userId: string, messageId: string) {
  const message = await prisma.supportMessage.findFirst({
    where: {
      id: messageId,
      conversation: { userId },
    },
    select: {
      attachmentName: true,
      attachmentMime: true,
      attachmentData: true,
    },
  });

  if (!message?.attachmentData || !message.attachmentName || !message.attachmentMime) {
    return null;
  }

  return {
    name: message.attachmentName,
    mime: message.attachmentMime,
    dataUrl: message.attachmentData,
  };
}

export async function getSupportMessageAttachmentForAdmin(messageId: string) {
  const message = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    select: {
      attachmentName: true,
      attachmentMime: true,
      attachmentData: true,
    },
  });

  if (!message?.attachmentData || !message.attachmentName || !message.attachmentMime) {
    return null;
  }

  return {
    name: message.attachmentName,
    mime: message.attachmentMime,
    dataUrl: message.attachmentData,
  };
}

export async function getUnreadSupportConversationCount() {
  return prisma.supportConversation.count({ where: { adminUnread: true } });
}
