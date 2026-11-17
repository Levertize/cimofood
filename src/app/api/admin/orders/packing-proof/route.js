import { NextResponse } from "next/server";
import { readImageFromFormData } from "@/lib/media-storage";
import {
  attachPackingProof,
  clearPackingProof,
  getAuthenticatedAdmin,
} from "@/lib/store-repo";

export async function POST(request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const orderId = String(formData.get("orderId") || "").trim();
    const { fileBuffer, mimeType } = await readImageFromFormData(
      formData,
      ["proof", "file"],
      "Pilih file foto bukti packing terlebih dahulu."
    );

    const { order } = await attachPackingProof({
      orderId,
      fileBuffer,
      mimeType,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah foto bukti packing." },
      { status: 400 }
    );
  }
}

export async function DELETE(request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orderId = String(searchParams.get("orderId") || "").trim();
    const { order } = await clearPackingProof(orderId);
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal menghapus foto bukti packing." },
      { status: 400 }
    );
  }
}
