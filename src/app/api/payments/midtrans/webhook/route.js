import { NextResponse } from "next/server";
import { processMidtransWebhook } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await processMidtransWebhook(payload);
    return NextResponse.json(result);
  } catch (err) {
    const status = err?.statusCode === 403 ? 403 : 400;
    return NextResponse.json(
      { error: err.message || "Gagal memproses notifikasi Midtrans." },
      { status }
    );
  }
}
