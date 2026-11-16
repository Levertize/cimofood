import { NextResponse } from "next/server";
import { signInAdmin, signOutAdmin } from "@/lib/store-repo";

export async function POST(request) {
  try {
    const body = await request.json();
    const session = await signInAdmin(body);
    return NextResponse.json({ session });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Gagal masuk ke dasbor admin." },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  await signOutAdmin();
  return NextResponse.json({ ok: true });
}
