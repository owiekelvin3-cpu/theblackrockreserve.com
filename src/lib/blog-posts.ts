import { marketingImages } from "@/lib/marketing-images";

export const blogPosts = [
  {
    slug: "future-of-digital-banking",
    title: "The Future of AI in Digital Banking",
    category: "Insights",
    excerpt: "How modern banks are using technology to deliver faster transfers, smarter insights, and better client experiences.",
    image: marketingImages.blog.aiBanking,
    date: "2026-03-15",
  },
  {
    slug: "building-wealth-guide",
    title: "Building Wealth with Smart Automation",
    category: "Guide",
    excerpt: "A practical guide to diversifying across savings, ETFs, and capital markets while managing risk.",
    image: marketingImages.blog.wealth,
    date: "2026-03-08",
  },
  {
    slug: "investor-security-practices",
    title: "Security Best Practices for Investors",
    category: "Security",
    excerpt: "Protect your accounts with strong authentication, device monitoring, and safe withdrawal habits.",
    image: marketingImages.blog.security,
    date: "2026-02-28",
  },
  {
    slug: "capital-markets-basics",
    title: "Getting Started in Capital Markets",
    category: "Investing",
    excerpt: "Learn how to research equities, place investments, and track portfolio performance from your dashboard.",
    image: marketingImages.features.investments,
    date: "2026-02-20",
  },
  {
    slug: "joint-accounts-explained",
    title: "Joint Accounts: What You Need to Know",
    category: "Banking",
    excerpt: "Shared banking for families and business partners — roles, approvals, and how to invite co-owners.",
    image: marketingImages.teamHero,
    date: "2026-02-12",
  },
  {
    slug: "loan-eligibility-overview",
    title: "Understanding Loan Eligibility & Tax Verification",
    category: "Loans",
    excerpt: "How tax refund verification unlocks loan products and what to expect during team review.",
    image: marketingImages.features.banking,
    date: "2026-02-05",
  },
] as const;
