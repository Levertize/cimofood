import { NextResponse } from "next/server";
import { attachPaymentProof } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const orderCode = formData.get("orderCode");
    const whatsapp = formData.get("whatsapp");
    const file = formData.get("proof");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Pilih file gambar bukti pembayaran terlebih dahulu." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { order } = await attachPaymentProof({
      orderCode,
      whatsapp,
      fileBuffer,
      fileName: file.name,
      mimeType: file.type,
    });

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah bukti pembayaran." },
      { status: 400 }
    );
  }
}
