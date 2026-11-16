import { NextResponse } from "next/server";
import {
  getAuthenticatedAdmin,
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/store-repo";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const data = await getSiteSettings();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const settings = await updateSiteSettings(body);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
