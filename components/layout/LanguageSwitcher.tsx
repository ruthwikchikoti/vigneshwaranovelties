"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: "en" | "te") => {
    if (next === locale) return;
    startTransition(() => router.replace(pathname, { locale: next }));
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-[0.7rem] tracking-[0.18em] uppercase",
        className
      )}
      aria-busy={pending}
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={cn(
          "px-2 py-1 transition-opacity",
          locale === "en" ? "opacity-100" : "opacity-50 hover:opacity-100"
        )}
      >
        {t("languageEn")}
      </button>
      <span className="opacity-30">/</span>
      <button
        type="button"
        onClick={() => switchTo("te")}
        className={cn(
          "px-2 py-1 transition-opacity",
          locale === "te" ? "opacity-100" : "opacity-50 hover:opacity-100"
        )}
      >
        {t("languageTe")}
      </button>
    </div>
  );
}
