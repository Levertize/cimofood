import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/store-repo";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const wa = searchParams.get("wa");
    const { order, settings } = await trackOrder(code, wa);
    return NextResponse.json({
      order,
      paymentInfo: {
        bank_info: settings.bank_info,
        qris_image_url: settings.qris_image_url,
        admin_whatsapp: settings.admin_whatsapp,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Pesanan tidak ditemukan." },
      { status: 404 }
    );
  }
}
