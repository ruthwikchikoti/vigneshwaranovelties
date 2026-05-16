"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { inquirySchema, type InquiryInput } from "@/lib/validations/inquiry";
import { Button } from "@/components/ui/Button";
import { whatsappGeneral } from "@/lib/whatsapp";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { enqueueInquiry } from "@/lib/inquiry-queue";
import { registerInquirySync, startFallbackRetry } from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

type Props = {
  source: "buy_now" | "cart";
  initialItems: InquiryInput["items"];
  onSuccess?: () => void;
  compact?: boolean;
};

export function InquiryForm({ source, initialItems, onSuccess, compact }: Props) {
  const t = useTranslations("inquiry");
  const locale = useLocale() as "en" | "te";
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      customer_name: "",
      mobile: "",
      address: "",
      message: "",
      source,
      items: initialItems,
      hp: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const enqueueAndRedirect = async () => {
      try {
        await enqueueInquiry(values);
        const synced = await registerInquirySync();
        if (!synced) {
          startFallbackRetry();
        }
        onSuccess?.();
        router.push("/inquiry/success?queued=1");
      } catch (idbErr) {
        // IndexedDB itself failed — last resort error
        console.error(idbErr);
        setSubmitError(t("errors.generic"));
      }
    };

    // If offline, skip fetch and go straight to queue path
    if (!navigator.onLine) {
      await enqueueAndRedirect();
      return;
    }

    // Online — attempt the fetch
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "submit");
      }
      // Navigate first; the success page mounts a <CartClearer /> which empties
      // the cart only after CartView has unmounted — no empty-cart flash.
      onSuccess?.();
      router.push("/inquiry/success");
    } catch (err) {
      console.error(err);
      // Fetch failed — queue offline and redirect
      await enqueueAndRedirect();
    }
  });

  const fieldClass =
    "w-full bg-transparent border-b border-ink/20 focus:border-ink py-3 text-ink placeholder:text-ink/40 outline-none transition-colors text-[0.95rem]";
  const labelClass =
    "smallcaps text-[0.6rem] text-champagne-deep mb-1 inline-block";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {/* Honeypot — hidden from real users */}
      <input
        {...register("hp")}
        type="text"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden
        className="hidden"
      />

      {!compact && (
        <p className="text-ink/60 text-[0.95rem] leading-relaxed">{t("subtitle")}</p>
      )}

      <div>
        <label className={labelClass} htmlFor="customer_name">
          {t("name")}
        </label>
        <input
          {...register("customer_name")}
          id="customer_name"
          className={fieldClass}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          required
        />
        {errors.customer_name && (
          <p className="text-cognac text-xs mt-1.5">{t("errors.name")}</p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="mobile">
          {t("mobile")}
        </label>
        <input
          {...register("mobile")}
          id="mobile"
          type="tel"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          className={fieldClass}
          placeholder={t("mobilePlaceholder")}
          autoComplete="tel"
          maxLength={10}
          required
        />
        {errors.mobile && (
          <p className="text-cognac text-xs mt-1.5">{t("errors.mobile")}</p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="address">
          {t("address")}
        </label>
        <input
          {...register("address")}
          id="address"
          className={fieldClass}
          placeholder={t("addressPlaceholder")}
          autoComplete="street-address"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          {t("message")}
        </label>
        <textarea
          {...register("message")}
          id="message"
          rows={3}
          className={cn(fieldClass, "resize-none")}
          placeholder={t("messagePlaceholder")}
        />
      </div>

      {submitError && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5">
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" variant="ink" disabled={isSubmitting} fullWidth>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
        <a
          href={whatsappGeneral(locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-base btn-whatsapp w-full"
        >
          <IconWhatsapp size={14} />
          {t("openWhatsapp")}
        </a>
      </div>
    </form>
  );
}
