

import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.event-clocks.com"),
  title: "Event Clocks",
  description:
    "Simple tools for planning events, meetings, and schedules across time zones.",
  alternates: {
    canonical: "https://www.event-clocks.com/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-B2HX3GQVYF"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B2HX3GQVYF');
          `}
        </Script>
        <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8550123052003634"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >

        <div style={{ width: "100%", padding: "12px 24px 0" }}>
          <Header />
        </div>

        {/* Page content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>

        {/* Footer */}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 24px" }}>
          <Footer />
        </div>
      </body>
    </html>
  );
}
