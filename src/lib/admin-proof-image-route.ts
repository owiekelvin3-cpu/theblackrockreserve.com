import { NextResponse } from "next/server";

export function adminProofImageResponse(proofImage: string | null | undefined) {
  if (!proofImage) {
    return NextResponse.json({ error: "Proof image not found" }, { status: 404 });
  }
  return NextResponse.json({ image: proofImage });
}
