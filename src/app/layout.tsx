import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Auto-Memorandum | Generator Dokumentów Prawno-Finansowych",
  description: "Automatyczny generator memorandum informacyjnego dla polskich spółek. Analiza danych KRS, sprawozdań finansowych i czynników ryzyka z wykorzystaniem AI.",
  keywords: ["memorandum", "KRS", "spółka", "dokument ofertowy", "analiza finansowa", "legal tech"],
  authors: [{ name: "Auto-Memorandum" }],
  openGraph: {
    title: "Auto-Memorandum | Generator Dokumentów Prawno-Finansowych",
    description: "Automatyczny generator memorandum informacyjnego dla polskich spółek z analizą AI.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.variable} antialiased gradient-bg`}>
        {children}
      </body>
    </html>
  );
}
