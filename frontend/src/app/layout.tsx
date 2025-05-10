import type { Metadata } from "next";
import "../styles/globals.css";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MemeGenHub - Community Meme Generator & Voting",
  description:
    "Create, share, and vote on memes in a community-driven platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen overflow-hidden">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
