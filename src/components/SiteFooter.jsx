import Link from "next/link";
import { normalizeWhatsapp } from "@/lib/pricing";

export function SiteFooter({ settings }) {
  const adminWa = normalizeWhatsapp(settings?.admin_whatsapp);
  const pirt =
    settings?.pirt_number && !settings.pirt_number.startsWith("[")
      ? settings.pirt_number
      : "Terdaftar Dinas Kesehatan";
  const halal =
    settings?.halal_number && !settings.halal_number.startsWith("[")
      ? settings.halal_number
      : "Tersertifikasi Halal";

  return (
    <footer className="mt-auto border-t border-subtle bg-sand">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md space-y-2">
            <p className="font-display text-2xl font-bold text-ink">CimoFood</p>
            <p className="text-sm leading-relaxed text-muted">
              Reseller digital resmi UMKM Cimoring (produksi mandiri sejak
              2017). Dikelola oleh Kelompok 2 Teknik Informatika UMP dengan
              prinsip harga transparan dan kemasan 4 lapis.
            </p>
            <p className="text-xs text-muted">
              Izin Edar PIRT: {pirt} | Sertifikat Halal: {halal}
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            <div>
              <p className="text-sm font-semibold text-ink">Halaman</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <Link href="/" className="inline-flex min-h-11 items-center text-muted hover:text-ink underline-offset-4 hover:underline">
                    Beranda
                  </Link>
                </li>
                <li>
                  <Link href="/katalog" className="inline-flex min-h-11 items-center text-muted hover:text-ink underline-offset-4 hover:underline">
                    Katalog Varian
                  </Link>
                </li>
                <li>
                  <Link href="/cek-pesanan" className="inline-flex min-h-11 items-center text-muted hover:text-ink underline-offset-4 hover:underline">
                    Cek Pesanan & Upload Bukti
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="inline-flex min-h-11 items-center text-muted hover:text-ink underline-offset-4 hover:underline">
                    Dasbor Pengelola
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">Layanan & Pengiriman</p>
              <p className="text-sm text-muted">
                Ekspedisi: Mandiri/Lokal, Anteraja, J&amp;T, JNE
              </p>
              {adminWa ? (
                <a
                  href={`https://wa.me/${adminWa}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-md border border-control bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas"
                >
                  Hubungi Admin via WhatsApp
                </a>
              ) : (
                <p className="text-sm text-muted">
                  Jam Layanan: Senin - Sabtu (08.00 - 20.00 WIB)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
