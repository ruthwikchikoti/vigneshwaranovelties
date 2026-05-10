import { site } from "@/lib/site";

export const metadata = { title: "Settings · Admin" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Store</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Settings
        </h1>
      </div>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-4">Store info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 text-sm">
          <Row label="Name" value={site.name} />
          <Row label="Established" value={String(site.established)} />
          <Row label="Address" value={`${site.address.line1}, ${site.address.line2}, ${site.address.city}`} fullSpan />
          <Row label="WhatsApp" value={site.whatsappNumber} mono />
          <Row label="Phone" value={site.ownerPhone} mono />
          <Row label="Email" value={site.ownerEmail} mono />
        </dl>
        <p className="text-xs text-ink/60 mt-5">
          Edit these values in <code className="bg-mist px-1">.env.local</code> for now.
          Inline editing will be added in the next iteration.
        </p>
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-4">Notifications</h2>
        <p className="text-sm text-ink/70 leading-relaxed">
          Inquiry emails are sent to <code className="bg-mist px-1">{process.env.INQUIRY_NOTIFICATION_EMAIL ?? "—"}</code> via Resend.
          Update <code className="bg-mist px-1">RESEND_API_KEY</code> and{" "}
          <code className="bg-mist px-1">INQUIRY_NOTIFICATION_EMAIL</code> in your env vars.
        </p>
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-4">CMS pages</h2>
        <ul className="text-sm space-y-2">
          {["about", "contact", "terms", "privacy"].map((slug) => (
            <li key={slug} className="flex justify-between">
              <span className="text-ink">/{slug}</span>
              <span className="text-ink/50 smallcaps text-[0.55rem]">Editor coming</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value, mono, fullSpan }: { label: string; value: string; mono?: boolean; fullSpan?: boolean }) {
  return (
    <div className={fullSpan ? "sm:col-span-3" : undefined}>
      <dt className="smallcaps text-[0.55rem] text-ink/50 mb-1">{label}</dt>
      <dd className={mono ? "tabular text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
