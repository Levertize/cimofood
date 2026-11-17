import { NextResponse } from "next/server";
import { syncMidtransPaymentStatus } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await syncMidtransPaymentStatus({
      orderCode: body.orderCode,
      whatsapp: body.whatsapp,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal memeriksa status pembayaran Midtrans." },
      { status: 400 }
    );
  }
}
