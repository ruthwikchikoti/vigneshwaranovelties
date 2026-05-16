import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <Container size="md" className="py-32 text-center flex flex-col items-center gap-6">
      <p className="smallcaps text-[0.65rem] text-champagne-deep">{t("eyebrow")}</p>
      <h1 className="font-display text-[3rem] lg:text-[4.5rem] text-ink leading-tight">
        {t("title")}
      </h1>
      <p className="text-ink/60 max-w-md">
        {t("body")}
      </p>
      <ButtonLink href="/" variant="ink" className="mt-4">
        {t("cta")}
        <IconArrowRight />
      </ButtonLink>
    </Container>
  );
}
