import Link from "next/link";
import { site } from "@/lib/site";
import {
  getAnnouncement,
  getHeroSettings,
  getHomeEditorial,
  HERO_MIN,
  HERO_MAX,
} from "@/lib/admin/settings";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { HeroSettingsForm } from "@/components/admin/HeroSettingsForm";
import { HomeEditorialForm } from "@/components/admin/HomeEditorialForm";

import { PushToggleWrapper } from "@/components/pwa/PushToggleWrapper";

export const metadata = { title: "Settings · Admin" };

export default async function SettingsPage() {
  const [announcement, heroSettings, homeEditorial] = await Promise.all([
    getAnnouncement(),
    getHeroSettings(),
    getHomeEditorial(),
  ]);
  const emailReady = Boolean(
    process.env.BREVO_API_KEY &&
      process.env.BREVO_FROM_EMAIL &&
      process.env.INQUIRY_NOTIFICATION_EMAIL
  );
  const vapidReady = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Store</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Settings
        </h1>
      </div>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Top announcement bar</h2>
        <p className="text-sm text-ink/65 mb-5">
          The thin strip at the very top of every storefront page. Use it for showroom hours, delivery thresholds, or festive notes.
        </p>
        <AnnouncementForm initial={announcement} />
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Homepage &ldquo;family shop&rdquo; image</h2>
        <p className="text-sm text-ink/65 mb-5">
          The portrait photo on the dark editorial section of the homepage (under &ldquo;Our family shop&rdquo;).
        </p>
        <HomeEditorialForm initial={homeEditorial} />
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Homepage banner timing</h2>
        <p className="text-sm text-ink/65 mb-5">
          How long each homepage banner stays before fading to the next. Only matters when you have more than one active banner.
        </p>
        <HeroSettingsForm initial={heroSettings} min={HERO_MIN} max={HERO_MAX} />
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Site pages</h2>
        <p className="text-sm text-ink/65 mb-4">
          Edit the About, Contact, and legal pages. Bilingual with auto-translate.
        </p>
        <ul className="text-sm divide-y divide-ink/10">
          {[
            { slug: "about", label: "About" },
            { slug: "contact", label: "Contact" },
            { slug: "faq", label: "FAQ" },
            { slug: "terms", label: "Terms & Conditions" },
            { slug: "privacy", label: "Privacy Policy" },
          ].map(({ slug, label }) => (
            <li key={slug}>
              <Link
                href={`/admin/cms/${slug}`}
                className="flex justify-between items-center py-3 group"
              >
                <span>
                  <span className="text-ink">{label}</span>
                  <span className="text-ink/40 ml-2 text-xs">/{slug}</span>
                </span>
                <span className="smallcaps text-[0.55rem] text-champagne-deep group-hover:text-ink transition-colors">
                  Edit →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-3">Email notifications</h2>
        {emailReady ? (
          <p className="text-sm text-ink/75 leading-relaxed">
            New inquiries are emailed to{" "}
            <span className="text-ink font-medium">{process.env.INQUIRY_NOTIFICATION_EMAIL}</span>.
            <span className="text-peacock smallcaps text-[0.55rem] tracking-[0.18em] ml-2">Active</span>
          </p>
        ) : (
          <p className="text-sm text-ink/75 leading-relaxed">
            Email notifications aren&apos;t set up yet — ask your developer to connect them.
          </p>
        )}
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Push notifications</h2>
        <p className="text-sm text-ink/65 mb-5">
          Get instant alerts on this device when a customer submits an inquiry.
          Works best with the installed app.
        </p>
        {vapidReady ? <PushToggleWrapper /> : (
          <p className="text-sm text-ink/75 leading-relaxed">
            Push notifications aren&apos;t set up yet — ask your developer to add VAPID keys.
          </p>
        )}
      </section>

      <section className="bg-mist-soft border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-4">Store info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 text-sm">
          <Row label="Name" value={site.name} />
          <Row label="Experience" value={site.experience} />
          <Row label="Address" value={`${site.address.line1}, ${site.address.line2}, ${site.address.city}`} fullSpan />
          <Row label="WhatsApp" value={site.whatsappNumber} mono />
          <Row label="Phone" value={site.ownerPhone} mono />
          <Row label="Email" value={site.ownerEmail} mono />
        </dl>
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
