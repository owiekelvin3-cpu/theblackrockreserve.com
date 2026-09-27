import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSubmitKyc, isKycBlockingAccess, KYC_ID_TYPES } from "@/lib/kyc";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";

const MAX_IMAGE = 5_000_000;

const submitSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  dateOfBirth: z.string().min(1),
  country: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(300),
  idType: z.enum(KYC_ID_TYPES),
  idNumber: z.string().trim().min(3).max(80),
  idFront: z.string().min(20).max(MAX_IMAGE),
  idBack: z.string().max(MAX_IMAGE).optional().or(z.literal("")),
});

async function getKycUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") return null;

  return prisma.user.findFirst({
    where: { id: session.user.id, role: "USER", status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      country: true,
      kycRequired: true,
      kycStatus: true,
      kycIdType: true,
      kycIdNumber: true,
      kycAddress: true,
      kycSubmittedAt: true,
      kycReviewedAt: true,
    },
  });
}

export async function GET() {
  const user = await getKycUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    required: user.kycRequired,
    status: user.kycStatus,
    blocking: isKycBlockingAccess(user),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
    country: user.country ?? "",
    address: user.kycAddress ?? "",
    idType: user.kycIdType ?? "NATIONAL_ID",
    idNumber: user.kycIdNumber ?? "",
    submittedAt: user.kycSubmittedAt?.toISOString() ?? null,
    reviewedAt: user.kycReviewedAt?.toISOString() ?? null,
  });
}

export async function POST(req: Request) {
  const user = await getKycUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.kycRequired) {
    return NextResponse.json({ error: "KYC is not required for this account." }, { status: 400 });
  }
  if (!canSubmitKyc(user.kycStatus)) {
    return NextResponse.json({ error: "Your verification is already under review." }, { status: 400 });
  }

  const ip = getClientIp(req) ?? "unknown";
  const limited = checkRateLimit(`kyc:submit:${user.id}:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = submitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please complete all required details." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const dob = new Date(data.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
  }

  const isImage = (value: string) => value.startsWith("data:image/");
  if (!isImage(data.idFront)) {
    return NextResponse.json({ error: "ID front must be an image." }, { status: 400 });
  }
  if (data.idType !== "PASSPORT" && (!data.idBack || !isImage(data.idBack))) {
    return NextResponse.json({ error: "Please upload the back of your ID." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.fullName,
      phone: data.phone,
      dateOfBirth: dob,
      country: data.country,
      kycAddress: data.address,
      kycIdType: data.idType,
      kycIdNumber: data.idNumber,
      kycIdFront: data.idFront,
      kycIdBack: data.idType === "PASSPORT" ? data.idBack || null : data.idBack,
      kycStatus: "SUBMITTED",
      kycSubmittedAt: new Date(),
      kycReviewedAt: null,
    },
  });

  return NextResponse.json({
    required: true,
    status: "SUBMITTED",
    blocking: true,
    message: "KYC Verification in Progress",
  });
}
