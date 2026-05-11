import Link from "next/link";

type Props = {
  href: string;
  label: string;
};

/** Small breadcrumb-style back link for admin new/edit pages. */
export function AdminBackLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 smallcaps text-[0.6rem] text-ink/55 hover:text-ink transition-colors"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
