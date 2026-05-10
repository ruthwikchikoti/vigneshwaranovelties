import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Props = {
  products: Product[];
  className?: string;
  cols?: 2 | 3 | 4;
  priorityCount?: number;
};

export function ProductGrid({ products, className, cols = 4, priorityCount = 0 }: Props) {
  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={cn("grid gap-4 sm:gap-6 lg:gap-10", colsClass, className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
