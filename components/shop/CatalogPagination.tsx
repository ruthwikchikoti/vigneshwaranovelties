import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  totalPages: number;
  basePath: "/shop";
  prevLabel: string;
  nextLabel: string;
  pageLabel: (page: number, total: number) => string;
  paginationLabel?: string;
};

function pageHref(basePath: "/shop", page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function CatalogPagination({
  currentPage,
  totalPages,
  basePath,
  prevLabel,
  nextLabel,
  pageLabel,
  paginationLabel = "Pagination",
}: Props) {
  if (totalPages <= 1) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      className="mt-12 lg:mt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-ink/10 pt-8"
      aria-label={paginationLabel}
    >
      <p className="text-sm text-ink/55 tabular text-center sm:text-left order-2 sm:order-1">
        {pageLabel(currentPage, totalPages)}
      </p>
      <div className="flex items-center justify-center gap-2 sm:justify-end order-1 sm:order-2">
        {prev != null ? (
          <Link
            href={pageHref(basePath, prev)}
            className={cn(
              "btn-base btn-ghost px-4 py-3 min-w-[7rem] justify-center",
              "text-[0.72rem] sm:text-[0.78rem]"
            )}
          >
            {prevLabel}
          </Link>
        ) : (
          <span
            className="btn-base btn-ghost px-4 py-3 min-w-[7rem] justify-center opacity-35 pointer-events-none text-[0.72rem] sm:text-[0.78rem]"
            aria-hidden
          >
            {prevLabel}
          </span>
        )}
        {next != null ? (
          <Link
            href={pageHref(basePath, next)}
            className={cn(
              "btn-base btn-ink px-4 py-3 min-w-[7rem] justify-center",
              "text-[0.72rem] sm:text-[0.78rem]"
            )}
          >
            {nextLabel}
          </Link>
        ) : (
          <span
            className="btn-base btn-ink px-4 py-3 min-w-[7rem] justify-center opacity-35 pointer-events-none text-[0.72rem] sm:text-[0.78rem]"
            aria-hidden
          >
            {nextLabel}
          </span>
        )}
      </div>
    </nav>
  );
}
