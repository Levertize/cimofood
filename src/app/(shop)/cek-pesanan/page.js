import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackOrderView } from "@/components/TrackOrderView";
import { getSiteSettings, trackOrder } from "@/lib/store-repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cek Pesanan & Upload Bukti | CimoFood",
};

export default async function CekPesananPage({ searchParams }) {
  const sp = await searchParams;
  const code = sp?.code ? String(sp.code) : "";
  const wa = sp?.wa ? String(sp.wa) : "";
  const method = sp?.method ? String(sp.method) : "midtrans_auto";

  const { settings } = await getSiteSettings();

  let initialResult = null;
  let initialError = "";
  if (code && wa) {
    try {
      const data = await trackOrder(code, wa);
      initialResult = {
        order: data.order,
        paymentInfo: {
          bank_info: data.settings.bank_info,
          qris_image_url: data.settings.qris_image_url,
          admin_whatsapp: data.settings.admin_whatsapp,
        },
      };
    } catch (err) {
      initialError = err.message;
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <TrackOrderView
          initialCode={code}
          initialWa={wa}
          initialMethod={method}
          initialResult={initialResult}
          initialError={initialError}
        />
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
