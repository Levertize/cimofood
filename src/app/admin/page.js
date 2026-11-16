import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
  getAuthenticatedAdmin,
  getCatalogData,
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

  const [orders, { products }, { settings }] = await Promise.all([
    listAdminOrders(),
    getCatalogData(),
    getSiteSettings(),
  ]);

  return (
    <AdminDashboard
      initialOrders={orders}
      initialProducts={products}
      initialSettings={settings}
      adminEmail={admin.email}
      isPreviewMode={admin.isPreviewMode}
    />
  );
}
