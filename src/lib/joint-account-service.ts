import { prisma } from "@/lib/prisma";
import { getAccounts } from "@/lib/dashboard-data";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { getMarketAssetBySymbol, calculateInvestmentFee } from "@/lib/market-assets";
import { getPlatformSettings, SETTING_KEYS } from "@/lib/platform-settings";
import { jointAccountInviteEmail, platformInviteEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

const INVITATION_TTL_DAYS = 14;

export interface EligibilityResult {
  eligible: boolean;
  requirements: { id: string; label: string; met: boolean }[];
}

export function checkJointEligibility(user: {
  status: string;
  emailVerified: Date | null;
  kycStatus: string;
}): EligibilityResult {
  const requirements = [
    { id: "active", label: "Account is active", met: user.status === "ACTIVE" },
    { id: "email", label: "Email verified", met: !!user.emailVerified },
    { id: "kyc", label: "KYC verification complete", met: user.kycStatus === "VERIFIED" },
    { id: "security", label: "Security profile complete", met: !!user.emailVerified && user.kycStatus === "VERIFIED" },
  ];
  return {
    eligible: requirements.every((r) => r.met),
    requirements,
  };
}

function generateAccountNumber(): string {
  const n = Math.floor(1000000000 + Math.random() * 9000000000);
  return `JA-${n}`;
}

export async function searchJointInvitee(query: {
  email?: string;
  name?: string;
  phone?: string;
  excludeUserId: string;
}) {
  const email = query.email?.trim().toLowerCase();
  const name = query.name?.trim();
  const phone = query.phone?.trim();

  if (!email && !name && !phone) {
    throw new Error("Enter email, name, or phone to search");
  }

  const user = await prisma.user.findFirst({
    where: {
      role: "USER",
      id: { not: query.excludeUserId },
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(name ? [{ name: { contains: name, mode: "insensitive" as const } }] : []),
        ...(phone ? [{ phone: { contains: phone } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      emailVerified: true,
      kycStatus: true,
    },
  });

  return user;
}

export async function createJointInvitation(params: {
  inviterId: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviteePhone?: string;
  ipAddress?: string;
}) {
  const inviter = await prisma.user.findUnique({
    where: { id: params.inviterId },
    select: { id: true, name: true, email: true, status: true, emailVerified: true, kycStatus: true },
  });
  if (!inviter) throw new Error("Inviter not found");

  const inviterCheck = checkJointEligibility(inviter);
  if (!inviterCheck.eligible) {
    throw new Error("Complete account verification before creating a joint account");
  }

  const email = params.inviteeEmail.trim().toLowerCase();
  if (email === inviter.email.toLowerCase()) {
    throw new Error("You cannot invite yourself");
  }

  const invitee = await searchJointInvitee({
    email,
    name: params.inviteeName,
    phone: params.inviteePhone,
    excludeUserId: params.inviterId,
  });

  if (!invitee) {
    return { found: false as const, email, name: params.inviteeName, phone: params.inviteePhone };
  }

  const existingPending = await prisma.jointAccountInvitation.findFirst({
    where: {
      inviterId: params.inviterId,
      inviteeId: invitee.id,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });
  if (existingPending) throw new Error("A pending invitation already exists for this user");

  const existingJoint = await prisma.jointAccountUser.findFirst({
    where: {
      userId: params.inviterId,
      jointAccount: {
        members: { some: { userId: invitee.id } },
        status: "ACTIVE",
      },
    },
  });
  if (existingJoint) throw new Error("You already share an active joint account with this user");

  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.jointAccountInvitation.create({
    data: {
      inviterId: params.inviterId,
      inviteeId: invitee.id,
      inviteeEmail: email,
      inviteeName: params.inviteeName?.trim() || invitee.name,
      inviteePhone: params.inviteePhone?.trim() || invitee.phone,
      expiresAt,
    },
  });

  const title = "Joint account invitation";
  const message = `You have been invited to create a joint account with ${inviter.name}. Review and respond in your Joint Account Invitations center.`;

  await createUserNotification({
    userId: invitee.id,
    type: "JOINT_INVITATION",
    title,
    message,
    invitationId: invitation.id,
  });

  await sendUserNotificationEmail({ userId: invitee.id, title, message });

  const mail = jointAccountInviteEmail({
    inviteeName: invitee.name,
    inviterName: inviter.name,
    siteUrl: getSiteUrl(),
  });
  await sendEmail({ to: invitee.email, ...mail });

  return { found: true as const, invitation: { id: invitation.id, inviteeName: invitee.name, inviteeEmail: invitee.email } };
}

export async function sendPlatformInvite(params: {
  inviterId: string;
  email: string;
  name?: string;
}) {
  const inviter = await prisma.user.findUnique({
    where: { id: params.inviterId },
    select: { name: true },
  });
  if (!inviter) throw new Error("User not found");

  const mail = platformInviteEmail({
    inviteeName: params.name?.trim() || "there",
    inviterName: inviter.name,
    siteUrl: getSiteUrl(),
  });

  await sendEmail({ to: params.email.trim().toLowerCase(), ...mail });
  return { sent: true };
}

export async function getUserJointInvitations(userId: string) {
  const [received, sent] = await Promise.all([
    prisma.jointAccountInvitation.findMany({
      where: { inviteeId: userId },
      orderBy: { createdAt: "desc" },
      include: { inviter: { select: { id: true, name: true, email: true } } },
    }),
    prisma.jointAccountInvitation.findMany({
      where: { inviterId: userId },
      orderBy: { createdAt: "desc" },
      include: { invitee: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const now = new Date();
  for (const inv of received) {
    if (inv.status === "PENDING" && inv.expiresAt < now) {
      await prisma.jointAccountInvitation.update({
        where: { id: inv.id },
        data: { status: "EXPIRED" },
      });
      inv.status = "EXPIRED";
    }
  }

  return {
    received: received.map((i) => ({
      id: i.id,
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
      inviter: i.inviter,
    })),
    sent: sent.map((i) => ({
      id: i.id,
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
      invitee: i.invitee,
      inviteeEmail: i.inviteeEmail,
    })),
  };
}

export async function respondToInvitation(params: {
  invitationId: string;
  userId: string;
  action: "ACCEPT" | "REJECT";
  ipAddress?: string;
}) {
  const invitation = await prisma.jointAccountInvitation.findFirst({
    where: { id: params.invitationId, inviteeId: params.userId },
    include: {
      inviter: { select: { id: true, name: true, email: true, status: true, emailVerified: true, kycStatus: true } },
      invitee: { select: { id: true, name: true, email: true, status: true, emailVerified: true, kycStatus: true } },
    },
  });

  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "PENDING") throw new Error("Invitation is no longer pending");
  if (invitation.expiresAt < new Date()) {
    await prisma.jointAccountInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    throw new Error("Invitation has expired");
  }

  if (params.action === "REJECT") {
    await prisma.jointAccountInvitation.update({
      where: { id: invitation.id },
      data: { status: "REJECTED" },
    });

    const title = "Joint account invitation declined";
    const message = `${invitation.invitee?.name ?? "The invitee"} declined your joint account invitation.`;
    await createUserNotification({ userId: invitation.inviterId, type: "JOINT_INVITATION_REJECTED", title, message, invitationId: invitation.id });
    await sendUserNotificationEmail({ userId: invitation.inviterId, title, message });

    return { status: "REJECTED" };
  }

  const invitee = invitation.invitee!;
  const inviterCheck = checkJointEligibility(invitation.inviter);
  const inviteeCheck = checkJointEligibility(invitee);

  if (!inviterCheck.eligible || !inviteeCheck.eligible) {
    throw new Error("Both parties must complete verification before activating a joint account");
  }

  let accountNumber = generateAccountNumber();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await prisma.jointAccount.findUnique({ where: { accountNumber } });
    if (!exists) break;
    accountNumber = generateAccountNumber();
    attempts++;
  }

  const jointAccount = await prisma.$transaction(async (tx) => {
    const account = await tx.jointAccount.create({
      data: {
        accountNumber,
        ownershipType: "JOINT_EQUAL",
        status: "ACTIVE",
      },
    });

    await tx.jointAccountUser.createMany({
      data: [
        { jointAccountId: account.id, userId: invitation.inviterId, role: "PRIMARY" },
        { jointAccountId: account.id, userId: invitation.inviteeId!, role: "CO_OWNER" },
      ],
    });

    await tx.jointAccountInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", jointAccountId: account.id },
    });

    await tx.jointAccountActivityLog.create({
      data: {
        jointAccountId: account.id,
        userId: params.userId,
        action: "JOINT_ACCOUNT_CREATED",
        details: JSON.stringify({ inviterId: invitation.inviterId, inviteeId: invitation.inviteeId }),
        ipAddress: params.ipAddress,
      },
    });

    return account;
  });

  const acceptTitle = "Joint account activated";
  const acceptMsgInviter = `Your joint account with ${invitee.name} is now active. Account ${jointAccount.accountNumber}.`;
  const acceptMsgInvitee = `Your joint account with ${invitation.inviter.name} is now active. Account ${jointAccount.accountNumber}.`;

  await Promise.all([
    createUserNotification({ userId: invitation.inviterId, type: "JOINT_ACCOUNT_ACTIVE", title: acceptTitle, message: acceptMsgInviter, jointAccountId: jointAccount.id }),
    createUserNotification({ userId: invitation.inviteeId!, type: "JOINT_ACCOUNT_ACTIVE", title: acceptTitle, message: acceptMsgInvitee, jointAccountId: jointAccount.id }),
    sendUserNotificationEmail({ userId: invitation.inviterId, title: acceptTitle, message: acceptMsgInviter }),
    sendUserNotificationEmail({ userId: invitation.inviteeId!, title: acceptTitle, message: acceptMsgInvitee }),
  ]);

  return { status: "ACCEPTED", jointAccountId: jointAccount.id, accountNumber: jointAccount.accountNumber };
}

export async function getUserJointAccounts(userId: string) {
  const memberships = await prisma.jointAccountUser.findMany({
    where: { userId, jointAccount: { status: "ACTIVE" } },
    include: {
      jointAccount: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          investments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => {
    const ja = m.jointAccount;
    const portfolioValue = ja.investments.reduce(
      (sum, inv) => sum + Number(inv.shares) * Number(inv.avgPrice),
      0
    );
    return {
      id: ja.id,
      accountNumber: ja.accountNumber,
      balance: Number(ja.balance),
      currency: ja.currency,
      status: ja.status,
      ownershipType: ja.ownershipType,
      role: m.role,
      members: ja.members.map((mem) => ({
        id: mem.user.id,
        name: mem.user.name,
        email: mem.user.email,
        role: mem.role,
      })),
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      positionsCount: ja.investments.length,
      createdAt: ja.createdAt.toISOString(),
    };
  });
}

export async function getJointAccountDetail(jointAccountId: string, userId: string) {
  const membership = await prisma.jointAccountUser.findFirst({
    where: { jointAccountId, userId },
    include: {
      jointAccount: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          transactions: { orderBy: { createdAt: "desc" }, take: 50 },
          investments: true,
          investmentOrders: { orderBy: { createdAt: "desc" }, take: 50 },
          activityLogs: { orderBy: { createdAt: "desc" }, take: 30 },
        },
      },
    },
  });

  if (!membership) throw new Error("Joint account not found");

  const ja = membership.jointAccount;
  const assets = await Promise.all(
    ja.investments.map(async (inv) => {
      const quote = await getMarketAssetBySymbol(inv.symbol);
      const marketPrice = quote?.price ?? Number(inv.avgPrice);
      const marketValue = Number(inv.shares) * marketPrice;
      const costBasis = Number(inv.shares) * Number(inv.avgPrice);
      return {
        symbol: inv.symbol,
        name: inv.name,
        shares: Number(inv.shares),
        avgPrice: Number(inv.avgPrice),
        marketPrice,
        marketValue,
        gainLoss: marketValue - costBasis,
        gainLossPercent: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0,
      };
    })
  );

  const portfolioValue = assets.reduce((s, a) => s + a.marketValue, 0);

  return {
    id: ja.id,
    accountNumber: ja.accountNumber,
    balance: Number(ja.balance),
    currency: ja.currency,
    status: ja.status,
    ownershipType: ja.ownershipType,
    role: membership.role,
    members: ja.members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role })),
    portfolioValue: Math.round(portfolioValue * 100) / 100,
    holdings: assets,
    transactions: ja.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    investmentHistory: ja.investmentOrders.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      assetName: o.assetName,
      amountUsd: Number(o.amountUsd),
      totalCost: Number(o.totalCost),
      createdAt: o.createdAt.toISOString(),
    })),
    activity: ja.activityLogs.map((l) => ({
      id: l.id,
      action: l.action,
      details: JSON.parse(l.details) as Record<string, unknown>,
      createdAt: l.createdAt.toISOString(),
      userId: l.userId,
    })),
    createdAt: ja.createdAt.toISOString(),
  };
}

export async function getApprovalThreshold(): Promise<number> {
  const settings = await getPlatformSettings([SETTING_KEYS.JOINT_APPROVAL_THRESHOLD]);
  const n = Number(settings[SETTING_KEYS.JOINT_APPROVAL_THRESHOLD]);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

async function getCoOwner(jointAccountId: string, userId: string) {
  const members = await prisma.jointAccountUser.findMany({
    where: { jointAccountId },
    select: { userId: true },
  });
  const other = members.find((m) => m.userId !== userId);
  if (!other) throw new Error("Co-owner not found");
  return other.userId;
}

export async function depositToJointAccount(params: {
  jointAccountId: string;
  userId: string;
  amount: number;
  personalAccountId?: string;
  ipAddress?: string;
}) {
  if (params.amount <= 0) throw new Error("Amount must be positive");

  const membership = await prisma.jointAccountUser.findFirst({
    where: { jointAccountId: params.jointAccountId, userId: params.userId },
  });
  if (!membership) throw new Error("Access denied");

  const accounts = await getAccounts(params.userId);
  const personal =
    (params.personalAccountId ? accounts.find((a) => a.id === params.personalAccountId) : null) ??
    accounts.find((a) => a.type === "checking") ??
    accounts[0];

  if (!personal) throw new Error("No personal account found");
  if (personal.balance < params.amount) throw new Error("Insufficient personal balance");

  await prisma.$transaction(async (tx) => {
    const bank = await tx.bankAccount.findFirst({ where: { id: personal.id, userId: params.userId } });
    if (!bank || Number(bank.balance) < params.amount) throw new Error("Insufficient balance");

    await tx.bankAccount.update({
      where: { id: personal.id },
      data: { balance: Number(bank.balance) - params.amount },
    });

    const joint = await tx.jointAccount.findUnique({ where: { id: params.jointAccountId } });
    if (!joint) throw new Error("Joint account not found");

    await tx.jointAccount.update({
      where: { id: params.jointAccountId },
      data: { balance: Number(joint.balance) + params.amount },
    });

    await tx.transaction.create({
      data: {
        userId: params.userId,
        accountId: personal.id,
        type: "TRANSFER",
        amount: params.amount,
        description: `Transfer to joint account ${joint.accountNumber}`,
        status: "COMPLETED",
      },
    });

    await tx.jointAccountTransaction.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        type: "DEPOSIT",
        amount: params.amount,
        description: `Deposit from personal account`,
        status: "COMPLETED",
      },
    });

    await tx.jointAccountActivityLog.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        action: "JOINT_DEPOSIT",
        details: JSON.stringify({ amount: params.amount }),
        ipAddress: params.ipAddress,
      },
    });
  });

  const coOwnerId = await getCoOwner(params.jointAccountId, params.userId);
  const title = "Joint account deposit";
  const message = `A deposit of $${params.amount.toFixed(2)} was made to your shared joint account.`;
  await createUserNotification({ userId: coOwnerId, type: "JOINT_DEPOSIT", title, message, jointAccountId: params.jointAccountId });
  await sendUserNotificationEmail({ userId: coOwnerId, title, message });

  return { success: true };
}

export async function withdrawFromJointAccount(params: {
  jointAccountId: string;
  userId: string;
  amount: number;
  personalAccountId?: string;
  ipAddress?: string;
}) {
  if (params.amount <= 0) throw new Error("Amount must be positive");

  const membership = await prisma.jointAccountUser.findFirst({
    where: { jointAccountId: params.jointAccountId, userId: params.userId },
  });
  if (!membership) throw new Error("Access denied");

  const threshold = await getApprovalThreshold();

  if (params.amount >= threshold) {
    const approverId = await getCoOwner(params.jointAccountId, params.userId);
    const joint = await prisma.jointAccount.findUnique({ where: { id: params.jointAccountId } });
    if (!joint || Number(joint.balance) < params.amount) throw new Error("Insufficient joint balance");

    const approval = await prisma.jointAccountApproval.create({
      data: {
        jointAccountId: params.jointAccountId,
        initiatedById: params.userId,
        approverId,
        type: "WITHDRAWAL",
        amount: params.amount,
        description: `Withdrawal of $${params.amount.toFixed(2)} to personal account`,
        payload: JSON.stringify({ personalAccountId: params.personalAccountId }),
        status: "PENDING",
      },
    });

    const title = "Withdrawal approval required";
    const message = `Your joint account partner requested a withdrawal of $${params.amount.toFixed(2)}. Review and approve in Joint Accounts.`;
    await createUserNotification({ userId: approverId, type: "JOINT_APPROVAL_REQUIRED", title, message, jointAccountId: params.jointAccountId, approvalId: approval.id });
    await sendUserNotificationEmail({ userId: approverId, title, message });

    return { pendingApproval: true, approvalId: approval.id };
  }

  await executeJointWithdrawal(params);
  return { pendingApproval: false, success: true };
}

async function executeJointWithdrawal(params: {
  jointAccountId: string;
  userId: string;
  amount: number;
  personalAccountId?: string;
  ipAddress?: string;
}) {
  const accounts = await getAccounts(params.userId);
  const personal =
    (params.personalAccountId ? accounts.find((a) => a.id === params.personalAccountId) : null) ??
    accounts.find((a) => a.type === "checking") ??
    accounts[0];
  if (!personal) throw new Error("No personal account found");

  await prisma.$transaction(async (tx) => {
    const joint = await tx.jointAccount.findUnique({ where: { id: params.jointAccountId } });
    if (!joint || Number(joint.balance) < params.amount) throw new Error("Insufficient joint balance");

    await tx.jointAccount.update({
      where: { id: params.jointAccountId },
      data: { balance: Number(joint.balance) - params.amount },
    });

    const bank = await tx.bankAccount.findFirst({ where: { id: personal.id, userId: params.userId } });
    if (!bank) throw new Error("Personal account not found");

    await tx.bankAccount.update({
      where: { id: personal.id },
      data: { balance: Number(bank.balance) + params.amount },
    });

    await tx.jointAccountTransaction.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        type: "WITHDRAWAL",
        amount: params.amount,
        description: "Withdrawal to personal account",
        status: "COMPLETED",
      },
    });

    await tx.transaction.create({
      data: {
        userId: params.userId,
        accountId: personal.id,
        type: "TRANSFER",
        amount: params.amount,
        description: `Transfer from joint account ${joint.accountNumber}`,
        status: "COMPLETED",
      },
    });

    await tx.jointAccountActivityLog.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        action: "JOINT_WITHDRAWAL",
        details: JSON.stringify({ amount: params.amount }),
        ipAddress: params.ipAddress,
      },
    });
  });

  const coOwnerId = await getCoOwner(params.jointAccountId, params.userId);
  const title = "Joint account withdrawal";
  const message = `A withdrawal of $${params.amount.toFixed(2)} was processed from your shared joint account.`;
  await createUserNotification({ userId: coOwnerId, type: "JOINT_WITHDRAWAL", title, message, jointAccountId: params.jointAccountId });
  await sendUserNotificationEmail({ userId: coOwnerId, title, message });
}

export async function respondToApproval(params: {
  approvalId: string;
  userId: string;
  action: "APPROVE" | "REJECT";
  ipAddress?: string;
}) {
  const approval = await prisma.jointAccountApproval.findFirst({
    where: { id: params.approvalId, approverId: params.userId, status: "PENDING" },
  });
  if (!approval) throw new Error("Approval request not found");

  if (params.action === "REJECT") {
    await prisma.jointAccountApproval.update({
      where: { id: approval.id },
      data: { status: "REJECTED", approvedAt: new Date() },
    });

    const title = "Withdrawal request rejected";
    const message = `Your joint account withdrawal request for $${Number(approval.amount).toFixed(2)} was rejected.`;
    await createUserNotification({ userId: approval.initiatedById, type: "JOINT_APPROVAL_REJECTED", title, message, approvalId: approval.id });
    await sendUserNotificationEmail({ userId: approval.initiatedById, title, message });
    return { status: "REJECTED" };
  }

  const payload = JSON.parse(approval.payload) as { personalAccountId?: string };

  if (approval.type === "WITHDRAWAL") {
    await executeJointWithdrawal({
      jointAccountId: approval.jointAccountId,
      userId: approval.initiatedById,
      amount: Number(approval.amount),
      personalAccountId: payload.personalAccountId,
      ipAddress: params.ipAddress,
    });
  } else if (approval.type === "INVESTMENT") {
    const investPayload = payload as { symbol: string; amountUsd: number };
    const asset = await getMarketAssetBySymbol(investPayload.symbol);
    if (!asset) throw new Error("Asset no longer available");
    const fee = calculateInvestmentFee(investPayload.amountUsd);
    const totalCost = Math.round((investPayload.amountUsd + fee) * 100) / 100;
    const shares = Math.round((investPayload.amountUsd / asset.price) * 1_000_000) / 1_000_000;
    await executeJointInvestment({
      jointAccountId: approval.jointAccountId,
      userId: approval.initiatedById,
      symbol: investPayload.symbol,
      amountUsd: investPayload.amountUsd,
      fee,
      totalCost,
      shares,
      assetName: asset.name,
      price: asset.price,
      ipAddress: params.ipAddress,
    });
  }

  await prisma.jointAccountApproval.update({
    where: { id: approval.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  const title = "Withdrawal approved";
  const message = `Your joint account withdrawal of $${Number(approval.amount).toFixed(2)} was approved and processed.`;
  await createUserNotification({ userId: approval.initiatedById, type: "JOINT_APPROVAL_APPROVED", title, message, approvalId: approval.id });
  await sendUserNotificationEmail({ userId: approval.initiatedById, title, message });

  return { status: "APPROVED" };
}

export async function getPendingApprovals(userId: string) {
  const rows = await prisma.jointAccountApproval.findMany({
    where: { approverId: userId, status: "PENDING" },
    include: {
      jointAccount: { select: { accountNumber: true } },
      initiator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    jointAccountId: r.jointAccountId,
    accountNumber: r.jointAccount.accountNumber,
    initiatorName: r.initiator.name,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function investFromJointAccount(params: {
  jointAccountId: string;
  userId: string;
  symbol: string;
  amountUsd: number;
  ipAddress?: string;
}) {
  const membership = await prisma.jointAccountUser.findFirst({
    where: { jointAccountId: params.jointAccountId, userId: params.userId },
  });
  if (!membership) throw new Error("Access denied");

  const asset = await getMarketAssetBySymbol(params.symbol);
  if (!asset) throw new Error("Asset not available");
  if (params.amountUsd < asset.minInvestment) {
    throw new Error(`Minimum investment is $${asset.minInvestment.toFixed(2)}`);
  }

  const fee = calculateInvestmentFee(params.amountUsd);
  const totalCost = Math.round((params.amountUsd + fee) * 100) / 100;
  const shares = Math.round((params.amountUsd / asset.price) * 1_000_000) / 1_000_000;

  const threshold = await getApprovalThreshold();
  if (totalCost >= threshold) {
    const approverId = await getCoOwner(params.jointAccountId, params.userId);
    const approval = await prisma.jointAccountApproval.create({
      data: {
        jointAccountId: params.jointAccountId,
        initiatedById: params.userId,
        approverId,
        type: "INVESTMENT",
        amount: totalCost,
        description: `Investment in ${params.symbol} — $${params.amountUsd.toFixed(2)}`,
        payload: JSON.stringify({ symbol: params.symbol, amountUsd: params.amountUsd }),
        status: "PENDING",
      },
    });

    const title = "Investment approval required";
    const message = `Your partner requested a $${totalCost.toFixed(2)} investment in ${params.symbol}. Approve in Joint Accounts.`;
    await createUserNotification({ userId: approverId, type: "JOINT_APPROVAL_REQUIRED", title, message, jointAccountId: params.jointAccountId, approvalId: approval.id });
    await sendUserNotificationEmail({ userId: approverId, title, message });
    return { pendingApproval: true, approvalId: approval.id };
  }

  await executeJointInvestment({ ...params, fee, totalCost, shares, assetName: asset.name, price: asset.price });
  return { pendingApproval: false, success: true };
}

async function executeJointInvestment(params: {
  jointAccountId: string;
  userId: string;
  symbol: string;
  amountUsd: number;
  fee: number;
  totalCost: number;
  shares: number;
  assetName: string;
  price: number;
  ipAddress?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const joint = await tx.jointAccount.findUnique({ where: { id: params.jointAccountId } });
    if (!joint || Number(joint.balance) < params.totalCost) throw new Error("Insufficient joint balance");

    await tx.jointAccount.update({
      where: { id: params.jointAccountId },
      data: { balance: Number(joint.balance) - params.totalCost },
    });

    await tx.jointAccountInvestmentOrder.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        symbol: params.symbol,
        assetName: params.assetName,
        amountUsd: params.amountUsd,
        shares: params.shares,
        priceAtPurchase: params.price,
        fee: params.fee,
        totalCost: params.totalCost,
      },
    });

    const existing = await tx.jointAccountInvestment.findUnique({
      where: { jointAccountId_symbol: { jointAccountId: params.jointAccountId, symbol: params.symbol } },
    });

    if (existing) {
      const oldShares = Number(existing.shares);
      const oldAvg = Number(existing.avgPrice);
      const newShares = oldShares + params.shares;
      const newAvg = Math.round(((oldShares * oldAvg + params.shares * params.price) / newShares) * 100) / 100;
      await tx.jointAccountInvestment.update({
        where: { id: existing.id },
        data: { shares: newShares, avgPrice: newAvg },
      });
    } else {
      await tx.jointAccountInvestment.create({
        data: {
          jointAccountId: params.jointAccountId,
          symbol: params.symbol,
          name: params.assetName,
          shares: params.shares,
          avgPrice: params.price,
        },
      });
    }

    await tx.jointAccountTransaction.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        type: "INVESTMENT",
        amount: params.totalCost,
        description: `Investment in ${params.symbol}`,
        status: "COMPLETED",
      },
    });

    await tx.jointAccountActivityLog.create({
      data: {
        jointAccountId: params.jointAccountId,
        userId: params.userId,
        action: "JOINT_INVESTMENT",
        details: JSON.stringify({ symbol: params.symbol, amountUsd: params.amountUsd, totalCost: params.totalCost }),
        ipAddress: params.ipAddress,
      },
    });
  });

  const coOwnerId = await getCoOwner(params.jointAccountId, params.userId);
  const title = "Joint account investment";
  const message = `A $${params.amountUsd.toFixed(2)} investment in ${params.symbol} was made from your shared joint account.`;
  await createUserNotification({ userId: coOwnerId, type: "JOINT_INVESTMENT", title, message, jointAccountId: params.jointAccountId });
  await sendUserNotificationEmail({ userId: coOwnerId, title, message });
}
