import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SOL Forecast",
  description: "Prediksi harga Solana menggunakan model Informer + BiLSTM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen relative">
        <Navbar />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}