import dynamic from "next/dynamic";
import Hero from "@/components/marketing/Hero";

function SectionLoader() {
  return (
    <div className="section-padding">
      <div className="mx-auto max-w-7xl h-48 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
    </div>
  );
}

const TrustBar = dynamic(() => import("@/components/marketing/TrustBar"), { loading: SectionLoader });
const Features = dynamic(() => import("@/components/marketing/Features"), { loading: SectionLoader });
const SolutionsGrid = dynamic(() => import("@/components/marketing/SolutionsGrid"), { loading: SectionLoader });
const Pricing = dynamic(() => import("@/components/marketing/Pricing"), { loading: SectionLoader });
const Testimonials = dynamic(() => import("@/components/marketing/Testimonials"), { loading: SectionLoader });
const FAQ = dynamic(() => import("@/components/marketing/FAQ"), { loading: SectionLoader });
const BlogResources = dynamic(() => import("@/components/marketing/BlogResources"), { loading: SectionLoader });
const CTABanner = dynamic(() => import("@/components/marketing/CTABanner"), { loading: SectionLoader });

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <SolutionsGrid />
      <Pricing />
      <Testimonials />
      <div id="faq">
        <FAQ />
      </div>
      <BlogResources />
      <CTABanner />
    </>
  );
}
