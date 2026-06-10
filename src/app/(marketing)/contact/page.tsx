"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { contactSchema, type ContactInput } from "@/lib/validations";
import { marketingImages } from "@/lib/marketing-images";

const faqs = [
  { q: "How do I open an account?", a: "Click 'Open Account' and complete our 3-step registration process. You'll need a valid government ID for KYC verification." },
  { q: "What are the fees?", a: "Standard banking and investment accounts have no monthly subscription fee. Investment products may carry fund-level expenses disclosed before you invest." },
  { q: "Is my money insured?", a: "Yes. Deposits are FDIC insured up to $250,000 per depositor, per account category." },
  { q: "How long do transfers take?", a: "Domestic transfers are instant. International transfers typically arrive within 1-3 business days depending on the destination." },
  { q: "Can I invest in cryptocurrency?", a: "Yes. Explore curated crypto index funds and digital asset products through the Investments and Capital Markets sections of your dashboard." },
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactInput) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      toast.success("Message sent successfully! We'll get back to you soon.");
      reset();
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
  };

  return (
    <>
      <section className="section-padding pt-32">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            className="font-display text-4xl sm:text-5xl font-bold text-text-primary text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Get in <span className="gold-gradient-text">Touch</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-text-secondary text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            Our banking and investment specialists are here to help with account setup, transfers, and portfolio questions.
          </motion.p>

          <motion.div
            className="mt-12 glass-card relative h-48 sm:h-64 overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Image
              src={marketingImages.contactHero}
              alt="Customer support team ready to assist"
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-bg-primary/30 to-transparent" />
          </motion.div>

          <div className="mt-16 grid lg:grid-cols-2 gap-12">
            <Card>
              <h2 className="text-xl font-semibold text-text-primary mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input label="Name" {...register("name")} error={errors.name?.message} placeholder="John Doe" />
                <Input label="Email" type="email" {...register("email")} error={errors.email?.message} placeholder="john@example.com" />
                <Input label="Subject" {...register("subject")} error={errors.subject?.message} placeholder="How can we help?" />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">Message</label>
                  <textarea
                    {...register("message")}
                    rows={5}
                    className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold/30 resize-none"
                    placeholder="Tell us more..."
                  />
                  {errors.message && <p className="text-sm text-accent-red">{errors.message.message}</p>}
                </div>
                <Button type="submit" isLoading={isSubmitting} className="w-full">Send Message</Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card>
                <h2 className="text-xl font-semibold text-text-primary mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-accent-gold mt-0.5" />
                    <div>
                      <p className="font-medium text-text-primary">Headquarters</p>
                      <p className="text-sm text-text-secondary">1 Blackrock Plaza, Suite 400<br />New York, NY 10004</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail size={20} className="text-accent-gold mt-0.5" />
                    <div>
                      <p className="font-medium text-text-primary">Email</p>
                      <p className="text-sm text-text-secondary">support@blackrockreserve.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={20} className="text-accent-gold mt-0.5" />
                    <div>
                      <p className="font-medium text-text-primary">Phone</p>
                      <p className="text-sm text-text-secondary">+1 (800) 555-0199</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="relative h-48 sm:h-56 overflow-hidden p-0">
                <Image
                  src={marketingImages.contactLocation}
                  alt="New York financial district skyline near our headquarters"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-bg-primary/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium text-text-primary">New York Headquarters</p>
                  <p className="text-xs text-text-secondary mt-1">1 Blackrock Plaza, Suite 400 · New York, NY 10004</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-bg-secondary">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-12">FAQ</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Card key={i} className="!p-0 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-text-primary">{faq.q}</span>
                  <ChevronDown size={20} className={`text-text-muted transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
