"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const milestones = [
  { year: "2019", title: "Founded", description: "Blackrock Reserve launched with a vision to democratize premium banking." },
  { year: "2020", title: "Series A", description: "Raised $45M to expand digital infrastructure and security systems." },
  { year: "2021", title: "Investment Platform", description: "Launched full-featured investment suite with zero-commission trading." },
  { year: "2022", title: "Global Expansion", description: "Extended services to 50+ countries with multi-currency support." },
  { year: "2023", title: "50K Members", description: "Reached 50,000 active members and $2B+ assets under management." },
  { year: "2024", title: "Elite Tier", description: "Introduced white-glove wealth management for high-net-worth clients." },
];

const values = [
  { title: "Integrity", description: "We operate with transparency and hold ourselves to the highest ethical standards in every transaction." },
  { title: "Innovation", description: "We continuously push the boundaries of financial technology to deliver cutting-edge solutions." },
  { title: "Inclusion", description: "Premium banking should be accessible. We design products that serve diverse financial needs." },
];

const leadership = [
  { name: "Victoria Ashford", title: "CEO & Co-Founder", avatar: "VA" },
  { name: "David Kim", title: "CTO", avatar: "DK" },
  { name: "Amara Osei", title: "CFO", avatar: "AO" },
  { name: "Robert Chen", title: "Chief Investment Officer", avatar: "RC" },
  { name: "Isabella Martinez", title: "Chief Compliance Officer", avatar: "IM" },
  { name: "Thomas Wright", title: "Head of Product", avatar: "TW" },
];

const press = ["Forbes", "TechCrunch", "Bloomberg", "Financial Times", "Wall Street Journal", "CNBC"];

export default function AboutPage() {
  return (
    <>
      <section className="section-padding pt-32 grain-overlay relative">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="gold" className="mb-6">Our Story</Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-text-primary">
              Redefining <span className="gold-gradient-text">Premium Banking</span>
            </h1>
            <p className="mt-6 text-lg text-text-secondary leading-relaxed">
              Founded in 2019, Blackrock Reserve was built on a simple belief: everyone deserves access to
              institutional-grade financial tools, wrapped in an experience worthy of their ambitions.
            </p>
          </motion.div>

          <div className="mt-16 glass-card h-64 sm:h-80 flex items-center justify-center">
            <p className="text-text-muted text-sm">Team Photo Placeholder</p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-bg-secondary">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-12">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
            <div className="space-y-12">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  className={`relative flex flex-col md:flex-row gap-4 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="md:w-1/2 md:px-8">
                    <Card className={i % 2 === 0 ? "md:ml-auto md:max-w-md" : "md:mr-auto md:max-w-md"}>
                      <span className="font-mono text-accent-gold text-sm">{m.year}</span>
                      <h3 className="text-lg font-semibold text-text-primary mt-1">{m.title}</h3>
                      <p className="text-sm text-text-secondary mt-2">{m.description}</p>
                    </Card>
                  </div>
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-accent-gold -translate-x-1.5 md:-translate-x-1.5 top-6" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card hover className="h-full text-center">
                  <h3 className="text-xl font-semibold text-accent-gold">{v.title}</h3>
                  <p className="mt-4 text-sm text-text-secondary leading-relaxed">{v.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-bg-secondary">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-12">Leadership</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {leadership.map((person, i) => (
              <motion.div key={person.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Card className="text-center">
                  <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-light flex items-center justify-center text-bg-primary text-xl font-bold">
                    {person.avatar}
                  </div>
                  <h3 className="mt-4 font-semibold text-text-primary">{person.name}</h3>
                  <p className="text-sm text-text-secondary">{person.title}</p>
                  <a href="#" className="inline-flex mt-3 text-accent-gold hover:text-accent-gold-light transition-colors">
                    <Linkedin size={18} />
                  </a>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="careers" className="section-padding scroll-mt-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-4">Careers</h2>
          <p className="text-text-secondary text-center max-w-2xl mx-auto mb-12">
            Join a team building the future of digital banking. We hire engineers, designers, compliance specialists, and customer success leaders.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { role: "Senior Full-Stack Engineer", location: "Remote · US", type: "Engineering" },
              { role: "Product Designer", location: "New York, NY", type: "Design" },
              { role: "Compliance Analyst", location: "Remote · US", type: "Operations" },
            ].map((job) => (
              <Card key={job.role} hover className="h-full">
                <Badge variant="blue" className="mb-3">{job.type}</Badge>
                <h3 className="font-semibold text-text-primary">{job.role}</h3>
                <p className="text-sm text-text-secondary mt-2">{job.location}</p>
                <Link href="/contact" className="inline-block mt-4 text-sm text-accent-brand hover:underline">
                  Apply via Contact →
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="press" className="section-padding scroll-mt-24">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary mb-12">In the Press</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {press.map((name) => (
              <div key={name} className="glass-card px-8 py-4 text-text-muted font-semibold text-sm">{name}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-bg-secondary">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary mb-6">Regulatory Information</h2>
          <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Blackrock Reserve is a member of the FDIC. Deposits are insured up to $250,000 per depositor.
            We are registered with FinCEN and comply with all applicable federal and state banking regulations.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Badge variant="gold">FDIC Member</Badge>
            <Badge variant="blue">FinCEN Registered</Badge>
          </div>
        </div>
      </section>
    </>
  );
}
