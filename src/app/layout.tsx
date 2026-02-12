import type { Metadata } from "next";
import { DM_Serif_Display, JetBrains_Mono, Inter } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://burgerprice.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Burger Price Index | The Financial Index for Burger Lovers",
  description:
    "Track burger prices across US cities with the BPI. Boston vs Seattle - who pays more for a burger? Weekly index updates, market reports, and the Burger of the Week.",
  openGraph: {
    title: "Burger Price Index",
    description:
      "The Bloomberg Terminal of burgers. Track real burger prices across US cities.",
    url: baseUrl,
    siteName: "Burger Price Index",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Burger Price Index - Boston vs Seattle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Burger Price Index",
    description:
      "The Bloomberg Terminal of burgers. Track real burger prices across US cities.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${jetbrainsMono.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
