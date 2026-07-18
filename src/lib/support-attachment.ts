const DISPLAYABLE_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/rtf",
]);

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

export type SupportAttachmentKind = "image" | "document" | "file";

export type SupportAttachmentInput = {
  name: string;
  mime: string;
  dataUrl: string;
};

export type ValidatedSupportAttachment = SupportAttachmentInput & {
  kind: SupportAttachmentKind;
  sizeBytes: number;
};

function estimateBase64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function kindForMime(mime: string): SupportAttachmentKind {
  if (IMAGE_MIME.has(mime) || DISPLAYABLE_IMAGE_MIME.has(mime)) return "image";
  if (DOC_MIME.has(mime)) return "document";
  return "file";
}

export function supportAttachmentAccept(kind: SupportAttachmentKind): string {
  if (kind === "image") return "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
  if (kind === "document") {
    return ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv";
  }
  return "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.rtf,application/pdf";
}

export function formatSupportAttachmentLabel(name: string, mime?: string | null): string {
  if (mime && (IMAGE_MIME.has(mime) || mime.startsWith("image/"))) return `Image · ${name}`;
  if (mime && mime.includes("pdf")) return `PDF · ${name}`;
  return `File · ${name}`;
}

export function validateSupportAttachment(
  input: SupportAttachmentInput
): { ok: true; attachment: ValidatedSupportAttachment } | { ok: false; error: string } {
  const name = input.name?.trim();
  const mime = input.mime?.trim().toLowerCase();
  const dataUrl = input.dataUrl?.trim();

  if (!name || name.length > 180) {
    return { ok: false, error: "Attachment name is invalid" };
  }
  if (!mime || !dataUrl) {
    return { ok: false, error: "Invalid attachment" };
  }

  if (mime === "image/heic" || mime === "image/heif") {
    return {
      ok: false,
      error: "HEIC photos are not supported here. Please send JPG or PNG instead.",
    };
  }

  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) {
    return { ok: false, error: "Malformed attachment data" };
  }

  const declaredMime = match[1].toLowerCase();
  if (declaredMime !== mime) {
    return { ok: false, error: "Attachment type mismatch" };
  }

  const allowed = DISPLAYABLE_IMAGE_MIME.has(mime) || DOC_MIME.has(mime);
  if (!allowed) {
    return {
      ok: false,
      error: "Allowed files: images (JPG, PNG, WEBP, GIF), PDF, Word, Excel, TXT, CSV",
    };
  }

  const sizeBytes = estimateBase64Bytes(match[2].replace(/\s+/g, ""));
  const max = DISPLAYABLE_IMAGE_MIME.has(mime) ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (sizeBytes > max) {
    return {
      ok: false,
      error: DISPLAYABLE_IMAGE_MIME.has(mime)
        ? "Images must be under 3 MB"
        : "Documents must be under 5 MB",
    };
  }
  if (sizeBytes < 32) {
    return { ok: false, error: "File is too small or corrupt" };
  }

  return {
    ok: true,
    attachment: {
      name,
      mime,
      dataUrl: `data:${mime};base64,${match[2].replace(/\s+/g, "")}`,
      kind: kindForMime(mime),
      sizeBytes,
    },
  };
}

async function compressImageFile(file: File): Promise<{ name: string; mime: string; dataUrl: string } | null> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return null;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(outputMime, IMAGE_QUALITY);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    const ext = outputMime === "image/png" ? "png" : "jpg";
    return {
      name: `${baseName}.${ext}`,
      mime: outputMime,
      dataUrl,
    };
  } catch {
    return null;
  }
}

export async function readFileAsSupportAttachment(
  file: File
): Promise<{ ok: true; attachment: ValidatedSupportAttachment } | { ok: false; error: string }> {
  if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name)) {
    return {
      ok: false,
      error: "HEIC photos are not supported here. Please send JPG or PNG instead.",
    };
  }

  const compressed = file.type.startsWith("image/") ? await compressImageFile(file) : null;
  if (compressed) {
    return validateSupportAttachment(compressed);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  return validateSupportAttachment({
    name: file.name,
    mime: file.type || "application/octet-stream",
    dataUrl,
  });
}
