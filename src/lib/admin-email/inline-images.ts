export type InlineEmailAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
};

const IMG_TAG_RE = /<img\b[^>]*>/gi;
const SRC_RE = /\ssrc\s*=\s*(["'])(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+)\1/i;

function extensionForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

/** Turn inline data-URL images into CID attachments so Gmail and other clients actually show them. */
export function extractInlineImages(html: string): { html: string; attachments: InlineEmailAttachment[] } {
  const attachments: InlineEmailAttachment[] = [];
  let index = 0;

  const nextHtml = html.replace(IMG_TAG_RE, (tag) => {
    const srcMatch = tag.match(SRC_RE);
    if (!srcMatch) return tag;

    const compact = srcMatch[2].replace(/\s+/g, "");
    const match = compact.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return tag;

    const mime = match[1].toLowerCase();
    const base64 = match[2];
    if (!["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"].includes(mime)) {
      return tag;
    }
    if (base64.length > 2_400_000) return tag;

    const contentType = mime === "image/jpg" ? "image/jpeg" : mime;
    const cid = `photo-${index + 1}@theblackrockreserve`;
    attachments.push({
      filename: `photo-${index + 1}.${extensionForMime(contentType)}`,
      content: Buffer.from(base64, "base64"),
      cid,
      contentType,
    });
    index += 1;
    return tag.replace(srcMatch[0], ` src="cid:${cid}"`);
  });

  return { html: nextHtml, attachments };
}

export const EMAIL_HTML_MAX_CHARS = 1_500_000;
