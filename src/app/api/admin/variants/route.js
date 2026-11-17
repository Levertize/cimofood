import { NextResponse } from "next/server";
import {
  getAdminCatalogData,
  getAuthenticatedAdmin,
  updateProduct,
  updateVariant,
} from "@/lib/store-repo";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const data = await getAdminCatalogData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (body.productId) {
      const product = await updateProduct(body.productId, body);
      return NextResponse.json({ product });
    }
    if (!body.variantId) {
      return NextResponse.json(
        { error: "ID produk atau ID varian wajib disertakan." },
        { status: 400 }
      );
    }
    const variant = await updateVariant(body.variantId, body);
    return NextResponse.json({ variant });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
