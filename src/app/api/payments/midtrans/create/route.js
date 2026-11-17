import { NextResponse } from "next/server";
import { createMidtransPaymentSession } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const body = await request.json();
    const requestOrigin = new URL(request.url).origin;
    const session = await createMidtransPaymentSession({
      orderCode: body.orderCode,
      whatsapp: body.whatsapp,
      forceNew: Boolean(body.forceNew),
      originUrl: requestOrigin,
    });
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal membuat sesi pembayaran Midtrans." },
      { status: 400 }
    );
  }
}
