import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LandingExperience } from "@/components/LandingExperience";
import { getCatalogData, getSiteSettings } from "@/lib/store-repo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ products }, { settings }] = await Promise.all([
    getCatalogData(),
    getSiteSettings(),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <LandingExperience products={products} settings={settings} />
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
