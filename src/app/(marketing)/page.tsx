import Hero from "@/components/marketing/Hero";
import TrustBar from "@/components/marketing/TrustBar";
import Features from "@/components/marketing/Features";
import SolutionsGrid from "@/components/marketing/SolutionsGrid";
import Pricing from "@/components/marketing/Pricing";
import Testimonials from "@/components/marketing/Testimonials";
import FAQ from "@/components/marketing/FAQ";
import BlogResources from "@/components/marketing/BlogResources";
import CTABanner from "@/components/marketing/CTABanner";

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
