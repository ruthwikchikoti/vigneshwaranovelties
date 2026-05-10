export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Vigneshwara Novelties",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "An heirloom of jewelry, gift articles & silver. A premium digital showroom by Vigneshwara Novelties.",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919866777053",
  ownerPhone: process.env.NEXT_PUBLIC_OWNER_PHONE ?? "+919866777053",
  ownerEmail: process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "hivexlabsx@gmail.com",
  established: 1998,
  socials: {
    instagram: "https://instagram.com/vigneshwaranovelties",
    facebook: "https://facebook.com/vigneshwaranovelties",
    youtube: "",
  },
  address: {
    line1: "Vigneshwara Novelties",
    line2: "Main Bazaar Road",
    city: "Andhra Pradesh",
    pin: "",
  },
} as const;

export type Site = typeof site;
