import Link from "next/link";
import Image from "next/image";
import { adminGetProducts } from "@/lib/admin/queries";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ikImage, placeholderImage } from "@/lib/imagekit";

export const metadata = { title: "Products · Admin" };

export default async function AdminProductsPage() {
  const products = await adminGetProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="smallcaps text-[0.65rem] text-champagne-deep">Catalog</p>
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
            Products
          </h1>
          <p className="text-ink/60 text-sm mt-1">{products.length} pieces</p>
        </div>
        <Link href="/admin/products/new" className="btn-base btn-ink">
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-12 text-center text-sm text-ink/50">
          No products yet.{" "}
          <Link href="/admin/products/new" className="underline">
            Add your first piece
          </Link>
          .
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const primary = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
            const url = primary?.original_url ?? placeholderImage(p.title_en);
            const price = p.discount_price_inr ?? p.price_inr;
            return (
              <li key={p.id} className="bg-ivory border border-ink/10">
                <Link href={`/admin/products/${p.id}`} className="block">
                  <div className="relative aspect-[4/5] bg-mist overflow-hidden">
                    <Image
                      src={ikImage(url, { width: 600 })}
                      alt={p.title_en}
                      fill
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      className="object-cover"
                    />
                    {!p.is_active && (
                      <div className="absolute inset-0 bg-ivory/70 grid place-items-center">
                        <span className="smallcaps text-[0.6rem] text-ink">Inactive</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <h3 className="font-medium text-ink line-clamp-2">{p.title_en}</h3>
                    <p className="tabular text-sm text-ink/70">{formatINR(price)}</p>
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {p.is_featured && <Tag>Featured</Tag>}
                      {p.is_trending && <Tag>Trending</Tag>}
                      {p.is_new_arrival && <Tag>New</Tag>}
                      {p.has_sale_badge && <Tag tone="sale">Sale</Tag>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "sale" }) {
  return (
    <span
      className={cn(
        "smallcaps text-[0.5rem] px-1.5 py-0.5",
        tone === "sale" ? "bg-cognac/10 text-cognac" : "bg-ink/5 text-ink/70"
      )}
    >
      {children}
    </span>
  );
}
