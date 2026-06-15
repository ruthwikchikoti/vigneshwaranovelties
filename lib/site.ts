export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Vigneshwara Novelties",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "1-gram gold jewelry, German silver, gift articles & more — a friendly digital showroom by Vigneshwara Novelties, Cherial.",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919866777053",
  ownerPhone: process.env.NEXT_PUBLIC_OWNER_PHONE ?? "+91 98667 77053",
  ownerPhoneAlt: "+91 98667 77043",
  ownerEmail: process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "vigneshwaranovelties@gmail.com",
  // Generic "more than 20 years" instead of a specific founding year.
  experience: "20+ years in Cherial",
  socials: {
    instagram: "https://instagram.com/vigneshwaranovelties",
    facebook: "https://facebook.com/vigneshwaranovelties",
    youtube: "",
  },
  address: {
    line1: "Vigneshwara Novelties",
    line2: "18-88/A, Chikoti Vijay, Cherial Road",
    line3: "opposite Keerthi Mess",
    city: "Cherial, Telangana 506223",
    pin: "506223",
  },
  // Exact shop location (from Google Business Profile) — local SEO + maps link.
  geo: { lat: 17.9214786, lng: 78.9726215 },
  mapUrl: "https://maps.app.goo.gl/HQG2ozRg6E8o2JbP9",
  hours: {
    label: "Open all 7 days",
    range: "10:00 AM — 8:00 PM",
  },
} as const;

export type Site = typeof site;
