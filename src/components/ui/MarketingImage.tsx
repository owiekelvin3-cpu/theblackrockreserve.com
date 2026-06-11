import Image, { type ImageProps } from "next/image";

/** External Unsplash assets — load directly to avoid optimizer/CDN failures on Vercel */
export default function MarketingImage({ alt = "", ...props }: ImageProps) {
  return <Image alt={alt} {...props} unoptimized />;
}
