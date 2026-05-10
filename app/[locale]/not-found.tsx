import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <Container size="md" className="py-32 text-center flex flex-col items-center gap-6">
      <p className="smallcaps text-[0.65rem] text-champagne-deep">404</p>
      <h1 className="font-display text-[3rem] lg:text-[4.5rem] text-ink leading-tight">
        We seem to have lost this piece.
      </h1>
      <p className="text-ink/60 max-w-md">
        The page you were looking for isn't here. Wander back to the showroom — there's
        plenty more to discover.
      </p>
      <ButtonLink href="/" variant="ink" className="mt-4">
        Return home
        <IconArrowRight />
      </ButtonLink>
    </Container>
  );
}
