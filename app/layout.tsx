import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const alta = localFont({
  src: "../public/alta-regular.otf",
  variable: "--font-alta",
});

export const metadata: Metadata = {
  title: "MaiGem Massage | Ponca City, OK",
  description: "Professional massage therapy services in Ponca City, Oklahoma. Located in the Om Yoga Wellness building. Relaxation, deep tissue, and therapeutic massage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${alta.variable} ${alta.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
