import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAuthenticatedAdmin, isSupabaseConfigured } from "@/lib/store-repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login Admin | CimoFood",
};

export default async function AdminLoginPage() {
  const session = await getAuthenticatedAdmin();
  if (session) {
    redirect("/admin");
  }

  return (
    <main id="main-content" className="flex-1 bg-canvas">
      <AdminLoginForm isPreviewMode={!isSupabaseConfigured()} />
    </main>
  );
}
