export const metadata = { title: "Offers · Admin" };

export default function OffersPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Limited time</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Offers
        </h1>
      </div>
      <div className="bg-mist-soft border border-dashed border-ink/20 p-10 text-center">
        <p className="smallcaps text-[0.6rem] text-champagne-deep mb-3">Coming next</p>
        <h2 className="font-display text-[1.5rem] text-ink mb-2">Offer & sale manager</h2>
        <p className="text-sm text-ink/60 max-w-md mx-auto">
          Schedule wedding-season offers, festive sales, and discount campaigns. Each
          offer has a banner, a discount percent, and start/end dates.
        </p>
      </div>
    </div>
  );
}
