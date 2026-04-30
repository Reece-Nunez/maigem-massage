import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "./globals.css";

const alta = localFont({
  src: "../public/alta-regular.otf",
  variable: "--font-alta",
});

const SITE_URL = "https://www.maigemassage.com";
const SITE_NAME = "MaiGem Massage";
const SITE_DESCRIPTION =
  "MaiGem Massage offers personalized therapeutic massage in Ponca City, Oklahoma. Licensed massage therapist Crystal Warren provides relaxation, deep tissue, and full-body sessions inside the tranquil Om Yoga Wellness building.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MaiGem Massage | Massage Therapy in Ponca City, OK",
    template: "%s | MaiGem Massage",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Crystal Warren" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "health",
  keywords: [
    "massage therapy Ponca City",
    "massage therapist Ponca City OK",
    "Ponca City massage",
    "Oklahoma massage",
    "deep tissue massage Ponca City",
    "relaxation massage Ponca City",
    "full body massage Ponca City",
    "back massage Ponca City",
    "therapeutic massage Oklahoma",
    "Crystal Warren massage",
    "MaiGem Massage",
    "Om Yoga Wellness massage",
    "licensed massage therapist Ponca City",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "MaiGem Massage | Massage Therapy in Ponca City, OK",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/maigem-logo.png",
        width: 500,
        height: 500,
        alt: "MaiGem Massage logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MaiGem Massage | Massage Therapy in Ponca City, OK",
    description: SITE_DESCRIPTION,
    images: ["/maigem-logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    "geo.region": "US-OK",
    "geo.placename": "Ponca City",
    "geo.position": "36.7115;-97.0815",
    ICBM: "36.7115, -97.0815",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4682b4",
};

// LocalBusiness structured data — primary signal for Google to identify the
// business, address, hours, and services. Also supports rich result eligibility
// (knowledge panel, "near me" surfaces, etc.). HealthAndBeautyBusiness is
// recognized by both Google's Rich Results Test and the strict
// validator.schema.org tool; additionalType narrows further to MassageBusiness
// for crawlers that understand the more specific subtype.
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "HealthAndBeautyBusiness"],
  additionalType: "https://schema.org/MassageBusiness",
  "@id": `${SITE_URL}/#business`,
  name: SITE_NAME,
  alternateName: "MaiGem Massage Therapy",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/maigem-logo.png`,
  logo: `${SITE_URL}/maigem-logo.png`,
  telephone: "+1-580-304-9861",
  email: "crystalwarren67@yahoo.com",
  founder: {
    "@type": "Person",
    name: "Crystal Warren",
    jobTitle: "Licensed Massage Therapist",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "205 E Chestnut Ave, Suite 5",
    addressLocality: "Ponca City",
    addressRegion: "OK",
    postalCode: "74604",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 36.7115,
    longitude: -97.0815,
  },
  areaServed: [
    { "@type": "City", name: "Ponca City" },
    { "@type": "AdministrativeArea", name: "Kay County" },
    { "@type": "AdministrativeArea", name: "Oklahoma" },
  ],
  priceRange: "$$",
  paymentAccepted: ["Cash", "Credit Card", "Venmo"],
  currenciesAccepted: "USD",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "09:00",
      closes: "18:00",
      description: "By appointment only",
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Massage Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Back Massage",
          description:
            "Focused 30-minute back rub for quick relaxation and tension relief.",
          serviceType: "Massage Therapy",
          provider: { "@id": `${SITE_URL}/#business` },
        },
      },
      {
        "@type": "Offer",
        price: "80",
        priceCurrency: "USD",
        itemOffered: {
          "@type": "Service",
          name: "Full Body Massage",
          description:
            "Classic 60-minute full body massage for overall relaxation and stress relief.",
          serviceType: "Massage Therapy",
          provider: { "@id": `${SITE_URL}/#business` },
        },
      },
      {
        "@type": "Offer",
        price: "110",
        priceCurrency: "USD",
        itemOffered: {
          "@type": "Service",
          name: "Full Body Extended Massage",
          description:
            "Deeper 90-minute massage for thorough tension release and relaxation.",
          serviceType: "Massage Therapy",
          provider: { "@id": `${SITE_URL}/#business` },
        },
      },
      {
        "@type": "Offer",
        price: "150",
        priceCurrency: "USD",
        itemOffered: {
          "@type": "Service",
          name: "Ultimate Relaxation",
          description:
            "Two-hour full-body massage targeting each muscle group for total restoration.",
          serviceType: "Massage Therapy",
          provider: { "@id": `${SITE_URL}/#business` },
        },
      },
    ],
  },
  containedInPlace: {
    "@type": "Place",
    name: "Om Yoga Wellness Center",
    address: {
      "@type": "PostalAddress",
      streetAddress: "205 E Chestnut Ave",
      addressLocality: "Ponca City",
      addressRegion: "OK",
      postalCode: "74604",
      addressCountry: "US",
    },
  },
  knowsAbout: [
    "Massage Therapy",
    "Relaxation Massage",
    "Deep Tissue Massage",
    "Therapeutic Massage",
    "Full Body Massage",
    "Stress Relief",
    "Muscle Tension Relief",
  ],
  potentialAction: {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/book`,
      inLanguage: "en-US",
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    result: {
      "@type": "Reservation",
      name: "Massage Appointment Reservation",
    },
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#business` },
  inLanguage: "en-US",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // Structured data must be inlined as raw JSON for crawlers
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={`${alta.variable} ${alta.className} antialiased`}>
        {children}
        <PageViewTracker />
        <Analytics />
      </body>
    </html>
  );
}
