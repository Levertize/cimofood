import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata = {
  title: "CimoFood | Reseller Resmi UMKM Cimoring",
  description:
    "Camilan keripik Cimoring asli berizin PIRT dan Halal sejak 2017. Pesan langsung dari produsen dengan kemasan aman 4 lapis.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${jakarta.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-canvas text-ink font-sans">
        <a href="#main-content" className="skip-link">
          Langsung ke konten utama
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
