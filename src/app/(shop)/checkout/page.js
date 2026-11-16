import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CheckoutView } from "@/components/CheckoutView";
import { getSiteSettings } from "@/lib/store-repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout | CimoFood",
};

export default async function CheckoutPage() {
  const { settings } = await getSiteSettings();

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <CheckoutView packingFee={Number(settings?.packing_fee ?? 2000)} />
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
