"use client";

import { useEffect, useState } from "react";
import MarketingImage from "@/components/ui/MarketingImage";
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
import { useI18n } from "@/components/providers/I18nProvider";
import type { ContactFaq } from "@/lib/platform-settings";

type ContactSettings = {
  contactEmail: string;
  contactPhone: string;
  contactAddressLine1: string;
  contactAddressLine2: string;
  contactHqTitle: string;
  contactHqAddress: string;
  contactFaqs: ContactFaq[];
};

export default function ContactPage() {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    fetch("/api/contact/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setContactSettings(data);
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (data: ContactInput) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      toast.success(t("contact.sendSuccess"));
      reset();
    } catch {
      toast.error(t("contact.sendFailed"));
    }
  };

  const addressLine1 = contactSettings?.contactAddressLine1 || t("contact.address");
  const addressLine2 = contactSettings?.contactAddressLine2 || t("contact.city");
  const supportEmail = contactSettings?.contactEmail || "support@blackrockreserve.com";
  const supportPhone = contactSettings?.contactPhone || "+1 (800) 555-0199";
  const hqTitle = contactSettings?.contactHqTitle || t("contact.hqTitle");
  const hqAddress = contactSettings?.contactHqAddress || t("contact.hqAddress");
  const faqs = contactSettings?.contactFaqs?.length
    ? contactSettings.contactFaqs
    : [
        { question: t("contact.faq1q"), answer: t("contact.faq1a") },
        { question: t("contact.faq2q"), answer: t("contact.faq2a") },
        { question: t("contact.faq3q"), answer: t("contact.faq3a") },
        { question: t("contact.faq4q"), answer: t("contact.faq4a") },
        { question: t("contact.faq5q"), answer: t("contact.faq5a") },
      ];

  return (
    <>
      <section className="section-padding pt-32">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            className="font-display text-4xl sm:text-5xl font-bold text-text-primary text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {t("contact.title")}{" "}
            <span className="gold-gradient-text">{t("contact.titleHighlight")}</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-text-secondary text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {t("contact.subtitle")}
          </motion.p>

          <motion.div
            className="mt-12 glass-card relative h-48 sm:h-64 overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MarketingImage
              src={marketingImages.contactHero}
              alt={t("contact.heroAlt")}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-bg-primary/30 to-transparent" />
          </motion.div>

          <div className="mt-16 grid lg:grid-cols-2 gap-12">
            <Card>
              <h2 className="text-xl font-semibold text-text-primary mb-6">{t("contact.formTitle")}</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input label={t("contact.name")} {...register("name")} error={errors.name?.message} placeholder={t("contact.namePlaceholder")} />
                <Input label={t("contact.email")} type="email" {...register("email")} error={errors.email?.message} placeholder={t("contact.emailPlaceholder")} />
                <Input label={t("contact.subject")} {...register("subject")} error={errors.subject?.message} placeholder={t("contact.subjectPlaceholder")} />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">{t("contact.message")}</label>
                  <textarea
                    {...register("message")}
                    rows={5}
                    className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold/30 resize-none"
                    placeholder={t("contact.messagePlaceholder")}
                  />
                  {errors.message && <p className="text-sm text-accent-red">{errors.message.message}</p>}
                </div>
                <Button type="submit" isLoading={isSubmitting} className="w-full">{t("contact.sendMessage")}</Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card>
                <h2 className="text-xl font-semibold text-text-primary mb-6">{t("contact.infoTitle")}</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-accent-gold mt-0.5" />
                    <div>
                      <p className="font-medium text-text-primary">{t("contact.headquarters")}</p>
                      <p className="text-sm text-text-secondary">{addressLine1}<br />{addressLine2}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail size={20} className="text-accent-gold mt-0.5" />
                    <div>
                      <p className="font-medium text-text-primary">{t("contact.email")}</p>
                      <a href={`mailto:${supportEmail}`} className="text-sm text-text-secondary hover:text-accent-brand transition-colors">
                        {supportEmail}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={20} className="text-accent-gold mt-0.5" />
                    <div>
                      <p className="font-medium text-text-primary">{t("contact.phone")}</p>
                      <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="text-sm text-text-secondary hover:text-accent-brand transition-colors">
                        {supportPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="relative h-48 sm:h-56 overflow-hidden p-0">
                <MarketingImage
                  src={marketingImages.contactLocation}
                  alt={t("contact.locationAlt")}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-bg-primary/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium text-text-primary">{hqTitle}</p>
                  <p className="text-xs text-text-secondary mt-1">{hqAddress}</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-bg-secondary">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-12">{t("contact.faqTitle")}</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Card key={`${faq.question}-${i}`} className="!p-0 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-text-primary">{faq.question}</span>
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
                      <p className="px-6 pb-6 text-sm text-text-secondary leading-relaxed">{faq.answer}</p>
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
