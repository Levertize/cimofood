import { NextResponse } from "next/server";
import { readImageFromFormData } from "@/lib/media-storage";
import { attachPaymentProof } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const orderCode = formData.get("orderCode");
    const whatsapp = formData.get("whatsapp");
    const { fileBuffer, mimeType } = await readImageFromFormData(
      formData,
      ["proof", "file"],
      "Pilih file gambar bukti pembayaran terlebih dahulu."
    );

    const { order } = await attachPaymentProof({
      orderCode,
      whatsapp,
      fileBuffer,
      mimeType,
    });

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah bukti pembayaran." },
      { status: 400 }
    );
  }
}
