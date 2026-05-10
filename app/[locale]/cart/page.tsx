import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { CartView } from "@/components/cart/CartView";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Container size="xl" className="py-12 lg:py-20">
      <CartView />
    </Container>
  );
}
