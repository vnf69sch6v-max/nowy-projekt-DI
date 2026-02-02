import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CompanyDataProvider } from "@/contexts/CompanyDataContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "StochFin — Probabilistic Company Valuation",
  description: "Monte Carlo DCF valuation with real financial data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.variable} antialiased`}>
        <CompanyDataProvider>
          {children}
        </CompanyDataProvider>
      </body>
    </html>
  );
}

