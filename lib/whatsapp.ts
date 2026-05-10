import { site } from "./site";

type ProductLite = {
  title: string;
  slug: string;
  price?: number | null;
};

export function whatsappUrl(message: string, number = site.whatsappNumber): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function whatsappForProduct(product: ProductLite, locale: "en" | "te" = "en"): string {
  const url = `${site.url}${locale === "te" ? "/te" : ""}/product/${product.slug}`;
  const priceLine =
    product.price != null
      ? locale === "te"
        ? `\nధర: ₹${product.price.toLocaleString("en-IN")}`
        : `\nPrice: ₹${product.price.toLocaleString("en-IN")}`
      : "";
  const greeting =
    locale === "te"
      ? `నమస్కారం! మీ ఈ ఉత్పత్తి గురించి తెలుసుకోవాలనుకుంటున్నాను: ${product.title}${priceLine}\n${url}`
      : `Hi! I'm interested in ${product.title}${priceLine}\n${url}`;
  return whatsappUrl(greeting);
}

export function whatsappGeneral(locale: "en" | "te" = "en"): string {
  const message =
    locale === "te"
      ? "నమస్కారం, విఘ్నేశ్వర నావెల్టీస్ నుండి సహాయం కావాలి."
      : "Hi, I'd like assistance from Vigneshwara Novelties.";
  return whatsappUrl(message);
}
