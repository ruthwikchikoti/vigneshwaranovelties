import { site } from "./site";

/**
 * Default FAQ content — shipped when no row exists in cms_pages yet.
 *
 * Used by:
 *   - The public /faq page (rendered when there's no CMS row)
 *   - The admin /admin/cms/faq editor (prefilled so the owner can edit existing
 *     questions instead of starting from a blank textarea)
 *
 * Format follows the Q:/A: convention parsed by `parseFaq()` in cms-render.tsx.
 * Once the owner saves, the database row replaces this default.
 */

const ADDRESS = `${site.address.line2}, ${site.address.city}`;
const HOURS = `${site.hours.label}, ${site.hours.range}`;

const EN = `Q: How do I place an order?
A: Add pieces to your cart and tap 'Send Order'. Fill in your name, mobile, and an optional address — we'll call or WhatsApp you within a few hours to confirm details and total. You don't pay anything online.

Q: Do you take payment on the website?
A: No. The website is for inquiries only. We confirm price, availability, and delivery on call, then accept payment at the showroom or via UPI / bank transfer once you're ready.

Q: Can I visit the showroom?
A: Of course — please do. We're at ${ADDRESS}. Open ${HOURS}.

Q: Do you ship across India?
A: Yes. We arrange courier delivery for most pieces. Charges depend on destination and item value — we tell you upfront when we confirm your inquiry.

Q: Do you do custom or bulk orders?
A: Yes — we take custom orders for personalised gifts and German silver articles, and bulk orders for weddings, festivals, return gifts, and corporate events. Send your reference photo on WhatsApp and we'll quote and confirm a timeline (usually 1–2 weeks).`;

const TE = `Q: ఆర్డర్ ఎలా చేయాలి?
A: ఇష్టమైన వస్తువులను కార్ట్‌లో జోడించి 'Send Order' నొక్కండి. మీ పేరు, మొబైల్ నంబర్, చిరునామా (ఐచ్ఛికం) ఇవ్వండి — మేము కొన్ని గంటల్లో కాల్ లేదా వాట్సాప్ ద్వారా వివరాలు మరియు మొత్తాన్ని నిర్ధారిస్తాము. ఆన్‌లైన్‌లో ఏమీ చెల్లించాల్సిన అవసరం లేదు.

Q: వెబ్‌సైట్‌లో చెల్లించాలా?
A: లేదు. వెబ్‌సైట్ కేవలం inquiry కోసమే. మేము కాల్‌లో ధర, లభ్యత, డెలివరీని నిర్ధారిస్తాము. మీరు సిద్ధంగా ఉన్నప్పుడు షోరూమ్‌లో లేదా UPI / బ్యాంక్ ట్రాన్స్‌ఫర్ ద్వారా చెల్లించవచ్చు.

Q: షోరూమ్‌ను సందర్శించవచ్చా?
A: తప్పకుండా రండి. మేము ${ADDRESS} లో ఉన్నాము. ${HOURS}.

Q: భారతదేశం అంతటా షిప్ చేస్తారా?
A: అవును. చాలా వస్తువులకు మేము కొరియర్ డెలివరీని ఏర్పాటు చేస్తాము. ఛార్జీలు గమ్యస్థానం మరియు వస్తువు విలువపై ఆధారపడి ఉంటాయి — మీ inquiry నిర్ధారిస్తున్నప్పుడు ముందే తెలియజేస్తాము.

Q: కస్టమ్ లేదా బల్క్ ఆర్డర్లు తీసుకుంటారా?
A: అవును — వ్యక్తిగతీకరించిన బహుమతులు, German silver వస్తువులకు కస్టమ్ ఆర్డర్లు, వివాహాలు, పండుగలు, రిటర్న్ గిఫ్ట్‌లు, కార్పొరేట్ ఈవెంట్‌ల కోసం బల్క్ ఆర్డర్‌లను తీసుకుంటాము. మీ రెఫరెన్స్ ఫోటో వాట్సాప్‌లో పంపండి — మేము కోట్ చేసి, కాలవ్యవధిని (సాధారణంగా 1-2 వారాలు) నిర్ధారిస్తాము.`;

export function getDefaultFaqText(locale: "en" | "te"): string {
  return locale === "te" ? TE : EN;
}

export const DEFAULT_FAQ_TITLE = {
  en: "Frequently asked",
  te: "తరచుగా అడిగే ప్రశ్నలు",
};
