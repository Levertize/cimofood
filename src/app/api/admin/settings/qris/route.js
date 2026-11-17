import { NextResponse } from "next/server";
import { readImageFromFormData } from "@/lib/media-storage";
import {
  clearStoreQrisImage,
  getAuthenticatedAdmin,
  uploadStoreQrisImage,
} from "@/lib/store-repo";

export async function POST(request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const { fileBuffer, mimeType } = await readImageFromFormData(
      formData,
      ["qris", "file"],
      "Pilih file gambar QRIS terlebih dahulu."
    );

    const { settings } = await uploadStoreQrisImage({ fileBuffer, mimeType });
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah gambar QRIS toko." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const { settings } = await clearStoreQrisImage();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal menghapus gambar QRIS toko." },
      { status: 400 }
    );
  }
}
