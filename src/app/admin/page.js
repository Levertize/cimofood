import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
  getAdminCatalogData,
  getAuthenticatedAdmin,
  getBackendReadiness,
  getSiteSettings,
  listAdminOrders,
} from "@/lib/store-repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dasbor Pengelola | CimoFood",
};

export default async function AdminPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const [orders, { products }, { settings }, backendStatus] = await Promise.all([
    listAdminOrders(),
    getAdminCatalogData(),
    getSiteSettings(),
    getBackendReadiness(),
  ]);

  return (
    <AdminDashboard
      initialOrders={orders}
      initialProducts={products}
      initialSettings={settings}
      backendStatus={backendStatus}
      adminEmail={admin.email}
      isPreviewMode={admin.isPreviewMode}
    />
  );
}
