import dynamic from "next/dynamic";
import Hero from "@/components/marketing/Hero";

const TrustBar = dynamic(() => import("@/components/marketing/TrustBar"));
const Features = dynamic(() => import("@/components/marketing/Features"));
const SolutionsGrid = dynamic(() => import("@/components/marketing/SolutionsGrid"));
const FAQ = dynamic(() => import("@/components/marketing/FAQ"));
const BlogResources = dynamic(() => import("@/components/marketing/BlogResources"));
const CTABanner = dynamic(() => import("@/components/marketing/CTABanner"));

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <SolutionsGrid />
      <div id="faq" className="scroll-mt-28">
        <FAQ />
      </div>
      <BlogResources />
      <CTABanner />
    </>
  );
}
