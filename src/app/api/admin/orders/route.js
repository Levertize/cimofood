import { NextResponse } from "next/server";
import {
  getAuthenticatedAdmin,
  listAdminOrders,
  updateAdminOrder,
} from "@/lib/store-repo";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const orders = await listAdminOrders();
    return NextResponse.json({ orders });
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
    if (!body.orderId) {
      return NextResponse.json(
        { error: "ID pesanan wajib disertakan." },
        { status: 400 }
      );
    }
    const order = await updateAdminOrder(body.orderId, body);
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
