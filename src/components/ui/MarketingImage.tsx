import Image, { type ImageProps } from "next/image";

/** External Unsplash assets — load directly to avoid optimizer/CDN failures on Vercel */
export default function MarketingImage(props: ImageProps) {
  return <Image {...props} unoptimized />;
}
