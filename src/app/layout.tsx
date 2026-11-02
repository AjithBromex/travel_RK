import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import DisableNumberScroll from "@/components/DisableNumberScroll";
import { Outfit, Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "RK Travel Hub — RK Enterprise",
  description: "Professional travel agency, vehicle fleet, trip management, payments, and financial reporting system.",
};

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"], 
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${plusJakartaSans.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} min-h-screen bg-page text-text-primary antialiased selection:bg-primary/10 selection:text-primary font-sans`}>
        <AuthProvider>
          <DisableNumberScroll />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
