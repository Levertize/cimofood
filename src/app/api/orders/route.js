import { NextResponse } from "next/server";
import { createOrder } from "@/lib/store-repo";
import { buildWhatsAppOrderUrl } from "@/lib/pricing";

export async function POST(request) {
  try {
    const body = await request.json();
    const { order, settings } = await createOrder(body);
    const whatsappUrl = buildWhatsAppOrderUrl(order, settings.admin_whatsapp);
    return NextResponse.json({ order, whatsappUrl }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal membuat pesanan." },
      { status: 400 }
    );
  }
}
