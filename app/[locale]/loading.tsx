import { Container } from "@/components/ui/Container";

/**
 * Route-level loading UI. Public pages render dynamically on the edge (Supabase
 * fetch → render → stream), so without this the browser would sit on the OLD page
 * for the whole round-trip and navigation felt frozen. This Suspense fallback
 * paints instantly under the (already-rendered) Header/Footer, so a tap gives
 * immediate feedback while the real page streams in behind it.
 *
 * One file at the [locale] segment covers home and every nested public route
 * that doesn't define its own loading.tsx.
 */
function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-ink/5 ${className}`} />;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Hero band */}
      <Shimmer className="h-[60vh] lg:h-[78vh] w-full" />

      <section className="py-20 lg:py-32">
        <Container size="xl">
          {/* Section header */}
          <div className="flex flex-col items-center gap-3">
            <Shimmer className="h-3 w-24 rounded-full" />
            <Shimmer className="h-8 w-64 rounded" />
            <Shimmer className="h-3 w-80 max-w-[80%] rounded-full" />
          </div>

          {/* Product grid */}
          <div className="mt-12 lg:mt-16 grid gap-4 sm:gap-6 lg:gap-10 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Shimmer className="aspect-[4/5] w-full" />
                <Shimmer className="h-2.5 w-16 rounded-full" />
                <Shimmer className="h-4 w-3/4 rounded" />
                <Shimmer className="h-3 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
