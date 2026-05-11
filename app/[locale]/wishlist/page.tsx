import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata = { title: "Saved pieces" };

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container size="xl">
      <WishlistView />
    </Container>
  );
}
