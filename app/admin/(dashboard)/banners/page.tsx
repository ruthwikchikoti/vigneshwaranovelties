export const metadata = { title: "Banners · Admin" };

export default function BannersPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Homepage</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Banners
        </h1>
      </div>
      <Placeholder
        title="Banner manager"
        description="Upload and reorder hero banners shown on the homepage and seasonal promo banners. Each banner can link to a category, product, or offer."
      />
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-mist-soft border border-dashed border-ink/20 p-10 text-center">
      <p className="smallcaps text-[0.6rem] text-champagne-deep mb-3">In progress</p>
      <h2 className="font-display text-[1.5rem] text-ink mb-2">{title}</h2>
      <p className="text-sm text-ink/60 max-w-md mx-auto">{description}</p>
    </div>
  );
}
