import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CatalogView } from "@/components/CatalogView";
import { getCatalogData, getSiteSettings } from "@/lib/store-repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog Produk | CimoFood",
};

export default async function KatalogPage() {
  const [{ products }, { settings }] = await Promise.all([
    getCatalogData(),
    getSiteSettings(),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">
              Memuat katalog produk Cimoring...
            </div>
          }
        >
          <CatalogView
            products={products}
            packingFee={Number(settings?.packing_fee ?? 2000)}
          />
        </Suspense>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
