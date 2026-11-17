import { NextResponse } from "next/server";
import { confirmOrderReceipt } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const body = await request.json();
    const { order } = await confirmOrderReceipt({
      orderCode: body.orderCode,
      whatsapp: body.whatsapp,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal mengonfirmasi penerimaan pesanan." },
      { status: 400 }
    );
  }
}
