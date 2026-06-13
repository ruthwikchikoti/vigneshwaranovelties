"use client";

import { useRouter } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconSearch } from "@/components/ui/Icons";

type Props = {
  initial?: string;
};

export function SearchInput({ initial = "" }: Props) {
  const t = useTranslations("search");
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus the field on first load if it's empty so the page feels search-first.
  useEffect(() => {
    if (!initial) inputRef.current?.focus();
  }, [initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <form
      onSubmit={submit}
      className="relative border-b-2 border-ink/15 focus-within:border-ink transition-colors max-w-2xl"
    >
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink/50">
        <IconSearch />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full bg-transparent text-ink py-4 pl-9 pr-24 text-[1.05rem] outline-none placeholder:text-ink/35"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute right-20 top-1/2 -translate-y-1/2 smallcaps text-[0.55rem] text-ink/50 hover:text-ink"
        >
          {t("clear")}
        </button>
      )}
      <button
        type="submit"
        className="absolute right-0 top-1/2 -translate-y-1/2 smallcaps text-[0.6rem] text-ink/80 hover:text-ink py-2 px-3"
      >
        {t("submit")}
      </button>
    </form>
  );
}
