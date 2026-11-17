import fs from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import {
  COURIERS,
  INITIAL_PRODUCTS,
  INITIAL_SITE_SETTINGS,
  ORDER_STATUS_META,
} from "./constants";
import { generateOrderCode, normalizeWhatsapp } from "./pricing";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "./supabase/server";
import {
  cleanEnvValue,
  isRealEnvValue,
  isSupabaseConfigured,
} from "./supabase/config";

export { isSupabaseConfigured };

const LOCAL_DB_PATH = path.join(process.cwd(), ".local-data.json");
const PREVIEW_COOKIE = "cimofood_preview_admin";
let memoryFallbackDb = null;

export function getAllowedAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => cleanEnvValue(item).toLowerCase())
    .filter((item) => isRealEnvValue(item));
}

function isAuthorizedAdminUser(user) {
  if (!user) return false;
  if (user.app_metadata?.role === "admin") return true;
  const allowed = getAllowedAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(String(user.email || "").trim().toLowerCase());
}

async function readLocalDb() {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const defaultImgMap = new Map(
      INITIAL_PRODUCTS.map((p) => [p.id, p.image_url])
    );
    if (Array.isArray(parsed.products)) {
      parsed.products = parsed.products.map((p) => {
        const freshImg = defaultImgMap.get(p.id);
        if (
          freshImg &&
          p.image_url === "/placeholders/product-placeholder.svg" &&
          freshImg !== "/placeholders/product-placeholder.svg"
        ) {
          return { ...p, image_url: freshImg };
        }
        return p;
      });
    }
    memoryFallbackDb = parsed;
    return parsed;
  } catch {
    if (memoryFallbackDb) return memoryFallbackDb;
    const seeded = {
      products: structuredClone(INITIAL_PRODUCTS),
      orders: [],
      settings: structuredClone(INITIAL_SITE_SETTINGS),
    };
    await writeLocalDb(seeded);
    return seeded;
  }
}

async function writeLocalDb(data) {
  memoryFallbackDb = data;
  try {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Gunakan fallback memori jika direktori server bersifat read-only
  }
}

export async function getCatalogData() {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const products = db.products
      .filter((p) => p.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
    return { products, isPreviewMode: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (prodError) throw new Error(prodError.message);

  const { data: variants, error: varError } = await supabase
    .from("product_variants")
    .select("*")
    .order("weight_grams", { ascending: true });

  if (varError) throw new Error(varError.message);

  const enriched = (products || []).map((p) => ({
    ...p,
    variants: (variants || []).filter((v) => v.product_id === p.id),
  }));

  return { products: enriched, isPreviewMode: false };
}

export async function getAdminCatalogData() {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const products = [...db.products].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    return { products, isPreviewMode: true };
  }

  const admin = createSupabaseAdminClient();
  const { data: products, error: prodError } = await admin
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (prodError) throw new Error(prodError.message);

  const { data: variants, error: varError } = await admin
    .from("product_variants")
    .select("*")
    .order("weight_grams", { ascending: true });

  if (varError) throw new Error(varError.message);

  const enriched = (products || []).map((p) => ({
    ...p,
    variants: (variants || []).filter((v) => v.product_id === p.id),
  }));

  return { products: enriched, isPreviewMode: false };
}

export async function getSiteSettings() {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    return { settings: db.settings, isPreviewMode: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    settings: data || structuredClone(INITIAL_SITE_SETTINGS),
    isPreviewMode: false,
  };
}

export async function createOrder(input) {
  const customerName = String(input.customerName || "").trim();
  const customerWhatsapp = normalizeWhatsapp(input.customerWhatsapp);
  const shippingAddress = String(input.shippingAddress || "").trim();
  const courier = String(input.courier || "").trim();
  const notes = String(input.notes || "").trim();
  const referralCode = String(input.referralCode || "").trim() || null;
  const itemsInput = Array.isArray(input.items) ? input.items : [];

  if (!customerName || customerName.length < 2) {
    throw new Error("Nama penerima wajib diisi minimal 2 karakter.");
  }
  if (!customerWhatsapp || customerWhatsapp.length < 9) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }
  if (!shippingAddress || shippingAddress.length < 8) {
    throw new Error("Alamat lengkap pengiriman wajib diisi.");
  }
  if (!COURIERS.some((c) => c.id === courier)) {
    throw new Error("Pilih metode pengiriman yang tersedia.");
  }
  if (itemsInput.length === 0) {
    throw new Error("Keranjang belanja masih kosong.");
  }

  const { products } = await getCatalogData();
  const { settings } = await getSiteSettings();
  const packingFee = Number(settings.packing_fee ?? 2000);

  const variantMap = new Map();
  for (const prod of products) {
    for (const v of prod.variants || []) {
      variantMap.set(v.id, { ...v, product_name: prod.name });
    }
  }

  let subtotalSell = 0;
  let subtotalBase = 0;
  const orderItems = [];

  for (const entry of itemsInput) {
    const qty = Number(entry.quantity || 0);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
      throw new Error("Jumlah item tidak valid.");
    }
    const variant = variantMap.get(entry.variantId);
    if (!variant) {
      throw new Error("Salah satu varian produk tidak ditemukan.");
    }
    if (!variant.is_available) {
      throw new Error(
        `${variant.product_name} (${variant.size_label}) sedang habis.`
      );
    }

    subtotalSell += variant.sell_price * qty;
    subtotalBase += variant.base_price * qty;
    orderItems.push({
      variant_id: variant.id,
      product_name: variant.product_name,
      size_label: variant.size_label,
      quantity: qty,
      unit_base_price: variant.base_price,
      unit_sell_price: variant.sell_price,
    });
  }

  const orderCode = generateOrderCode();
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const newOrder = {
      id: `ord-${Date.now()}`,
      order_code: orderCode,
      customer_name: customerName,
      customer_whatsapp: customerWhatsapp,
      shipping_address: shippingAddress,
      courier,
      subtotal_sell: subtotalSell,
      subtotal_base: subtotalBase,
      packing_fee: packingFee,
      shipping_cost: 0,
      total_amount: subtotalSell + packingFee,
      status: "menunggu_konfirmasi",
      payment_proof_url: null,
      payment_provider: null,
      payment_order_id: null,
      payment_snap_token: null,
      payment_redirect_url: null,
      payment_method: null,
      payment_reference: null,
      payment_fee: 0,
      paid_at: null,
      tracking_number: null,
      packing_proof_url: null,
      referral_code: referralCode,
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
      items: orderItems,
    };
    db.orders.unshift(newOrder);
    await writeLocalDb(db);
    return { order: newOrder, settings };
  }

  const admin = createSupabaseAdminClient();
  const { data: orderRow, error: orderErr } = await admin
    .from("orders")
    .insert({
      order_code: orderCode,
      customer_name: customerName,
      customer_whatsapp: customerWhatsapp,
      shipping_address: shippingAddress,
      courier,
      subtotal_sell: subtotalSell,
      subtotal_base: subtotalBase,
      packing_fee: packingFee,
      shipping_cost: 0,
      total_amount: subtotalSell + packingFee,
      status: "menunggu_konfirmasi",
      referral_code: referralCode,
      notes: notes || null,
    })
    .select("*")
    .single();

  if (orderErr) throw new Error(orderErr.message);

  const itemsWithOrderId = orderItems.map((it) => ({
    ...it,
    order_id: orderRow.id,
  }));
  const { error: itemsErr } = await admin
    .from("order_items")
    .insert(itemsWithOrderId);

  if (itemsErr) throw new Error(itemsErr.message);

  return { order: { ...orderRow, items: orderItems }, settings };
}

export async function trackOrder(orderCode, whatsapp) {
  const cleanCode = String(orderCode || "").trim().toUpperCase();
  const cleanWa = normalizeWhatsapp(whatsapp);
  if (!cleanCode || !cleanWa) {
    throw new Error("Masukkan kode pesanan dan nomor WhatsApp.");
  }

  const { settings } = await getSiteSettings();

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const found = db.orders.find(
      (o) =>
        o.order_code.toUpperCase() === cleanCode &&
        normalizeWhatsapp(o.customer_whatsapp) === cleanWa
    );
    if (!found) {
      throw new Error(
        "Pesanan tidak ditemukan. Periksa kembali kode pesanan dan nomor WhatsApp."
      );
    }
    return { order: found, settings };
  }

  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_code", cleanCode)
    .eq("customer_whatsapp", cleanWa)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) {
    throw new Error(
      "Pesanan tidak ditemukan. Periksa kembali kode pesanan dan nomor WhatsApp."
    );
  }

  const { order_items, ...rest } = order;
  return { order: { ...rest, items: order_items || [] }, settings };
}

export async function attachPaymentProof({
  orderCode,
  whatsapp,
  fileBuffer,
  fileName,
  mimeType,
}) {
  const cleanCode = String(orderCode || "").trim().toUpperCase();
  const cleanWa = normalizeWhatsapp(whatsapp);
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(mimeType)) {
    throw new Error("Format bukti pembayaran harus JPG, PNG, atau WebP.");
  }
  if (fileBuffer.byteLength > 2 * 1024 * 1024) {
    throw new Error("Ukuran gambar maksimal 2 MB.");
  }

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const idx = db.orders.findIndex(
      (o) =>
        o.order_code.toUpperCase() === cleanCode &&
        normalizeWhatsapp(o.customer_whatsapp) === cleanWa
    );
    if (idx === -1) {
      throw new Error("Pesanan tidak ditemukan untuk kode & nomor WhatsApp ini.");
    }
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    db.orders[idx].payment_proof_url = dataUrl;
    if (
      ["menunggu_konfirmasi", "menunggu_pembayaran"].includes(
        db.orders[idx].status
      )
    ) {
      db.orders[idx].status = "verifikasi_bayar";
    }
    db.orders[idx].updated_at = new Date().toISOString();
    await writeLocalDb(db);
    return { order: db.orders[idx] };
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("orders")
    .select("*")
    .eq("order_code", cleanCode)
    .eq("customer_whatsapp", cleanWa)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!existing) {
    throw new Error("Pesanan tidak ditemukan untuk kode & nomor WhatsApp ini.");
  }

  const ext = fileName?.split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `${existing.order_code}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from("payment-proofs")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadErr) throw new Error(uploadErr.message);

  const nextStatus = ["menunggu_konfirmasi", "menunggu_pembayaran"].includes(
    existing.status
  )
    ? "verifikasi_bayar"
    : existing.status;

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      payment_proof_url: storagePath,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  const { order_items, ...rest } = updated;
  return { order: { ...rest, items: order_items || [] } };
}

export async function getAuthenticatedAdmin() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const isPreviewAdmin = cookieStore.get(PREVIEW_COOKIE)?.value === "1";
    return isPreviewAdmin
      ? { email: "preview-admin@cimofood.local", isPreviewMode: true }
      : null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user || !isAuthorizedAdminUser(data.user)) return null;
  return { email: data.user.email, id: data.user.id, isPreviewMode: false };
}

export async function signInAdmin({ email, password }) {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    cookieStore.set(PREVIEW_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return { email: "preview-admin@cimofood.local", isPreviewMode: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password: String(password || ""),
  });

  if (error) throw new Error("Email atau kata sandi admin salah.");
  if (!isAuthorizedAdminUser(data.user)) {
    await supabase.auth.signOut();
    throw new Error(
      "Akun ini belum diizinkan mengakses admin (periksa ADMIN_EMAILS)."
    );
  }
  if (data.user?.app_metadata?.role !== "admin") {
    try {
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.updateUserById(data.user.id, {
        app_metadata: { ...(data.user.app_metadata || {}), role: "admin" },
      });
    } catch {
      // Tetap izinkan login via whitelist ADMIN_EMAILS jika sync metadata gagal
    }
  }
  return { email: data.user.email, id: data.user.id, isPreviewMode: false };
}

export async function signOutAdmin() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    cookieStore.delete(PREVIEW_COOKIE);
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function listAdminOrders() {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    return db.orders.map((o) => ({
      ...o,
      payment_proof_signed_url: o.payment_proof_url || null,
    }));
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const enriched = await Promise.all(
    (data || []).map(async (row) => {
      const { order_items, ...rest } = row;
      let signedUrl = null;
      if (row.payment_proof_url) {
        const { data: signed } = await admin.storage
          .from("payment-proofs")
          .createSignedUrl(row.payment_proof_url, 3600);
        signedUrl = signed?.signedUrl || null;
      }
      return {
        ...rest,
        items: order_items || [],
        payment_proof_signed_url: signedUrl,
      };
    })
  );

  return enriched;
}

export async function updateAdminOrder(orderId, payload) {
  const nextShipping =
    payload.shipping_cost !== undefined
      ? Math.max(0, Math.round(Number(payload.shipping_cost || 0)))
      : undefined;
  const nextStatus = payload.status;
  const nextTracking =
    payload.tracking_number !== undefined
      ? String(payload.tracking_number || "").trim() || null
      : undefined;

  if (nextStatus && !ORDER_STATUS_META[nextStatus]) {
    throw new Error("Status pesanan tidak valid.");
  }

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const idx = db.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error("Pesanan tidak ditemukan.");

    const current = db.orders[idx];
    const shippingCost =
      nextShipping !== undefined ? nextShipping : current.shipping_cost;
    const totalAmount =
      Number(current.subtotal_sell) +
      Number(current.packing_fee) +
      Number(shippingCost);

    db.orders[idx] = {
      ...current,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      status: nextStatus || current.status,
      tracking_number:
        nextTracking !== undefined ? nextTracking : current.tracking_number,
      updated_at: new Date().toISOString(),
    };
    await writeLocalDb(db);
    return db.orders[idx];
  }

  const admin = createSupabaseAdminClient();
  const { data: current, error: findErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (findErr || !current) throw new Error("Pesanan tidak ditemukan.");

  const shippingCost =
    nextShipping !== undefined ? nextShipping : current.shipping_cost;
  const totalAmount =
    Number(current.subtotal_sell) +
    Number(current.packing_fee) +
    Number(shippingCost);

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      status: nextStatus || current.status,
      tracking_number:
        nextTracking !== undefined ? nextTracking : current.tracking_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  const { order_items, ...rest } = updated;
  return { ...rest, items: order_items || [] };
}

export async function updateVariant(variantId, payload) {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    for (const prod of db.products) {
      const idx = (prod.variants || []).findIndex((v) => v.id === variantId);
      if (idx !== -1) {
        const cur = prod.variants[idx];
        prod.variants[idx] = {
          ...cur,
          is_available:
            payload.is_available !== undefined
              ? Boolean(payload.is_available)
              : cur.is_available,
          base_price:
            payload.base_price !== undefined
              ? Math.max(0, Math.round(Number(payload.base_price)))
              : cur.base_price,
          sell_price:
            payload.sell_price !== undefined
              ? Math.max(0, Math.round(Number(payload.sell_price)))
              : cur.sell_price,
          shopee_price:
            payload.shopee_price !== undefined
              ? payload.shopee_price === "" || payload.shopee_price === null
                ? null
                : Math.max(0, Math.round(Number(payload.shopee_price)))
              : cur.shopee_price,
          stock_note:
            payload.stock_note !== undefined
              ? String(payload.stock_note || "").trim() || null
              : cur.stock_note,
        };
        await writeLocalDb(db);
        return prod.variants[idx];
      }
    }
    throw new Error("Varian tidak ditemukan.");
  }

  const admin = createSupabaseAdminClient();
  const updates = {};
  if (payload.is_available !== undefined)
    updates.is_available = Boolean(payload.is_available);
  if (payload.base_price !== undefined)
    updates.base_price = Math.max(0, Math.round(Number(payload.base_price)));
  if (payload.sell_price !== undefined)
    updates.sell_price = Math.max(0, Math.round(Number(payload.sell_price)));
  if (payload.shopee_price !== undefined) {
    updates.shopee_price =
      payload.shopee_price === "" || payload.shopee_price === null
        ? null
        : Math.max(0, Math.round(Number(payload.shopee_price)));
  }
  if (payload.stock_note !== undefined) {
    updates.stock_note = String(payload.stock_note || "").trim() || null;
  }

  const { data, error } = await admin
    .from("product_variants")
    .update(updates)
    .eq("id", variantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProduct(productId, payload) {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const idx = db.products.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error("Produk tidak ditemukan.");

    const cur = db.products[idx];
    db.products[idx] = {
      ...cur,
      is_active:
        payload.is_active !== undefined
          ? Boolean(payload.is_active)
          : cur.is_active,
      name:
        payload.name !== undefined
          ? String(payload.name || "").trim() || cur.name
          : cur.name,
      description:
        payload.description !== undefined
          ? String(payload.description || "").trim()
          : cur.description,
    };
    await writeLocalDb(db);
    return db.products[idx];
  }

  const admin = createSupabaseAdminClient();
  const updates = {};
  if (payload.is_active !== undefined)
    updates.is_active = Boolean(payload.is_active);
  if (payload.name !== undefined) {
    const cleanName = String(payload.name || "").trim();
    if (!cleanName) throw new Error("Nama produk tidak boleh kosong.");
    updates.name = cleanName;
  }
  if (payload.description !== undefined) {
    updates.description = String(payload.description || "").trim();
  }

  const { data, error } = await admin
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select("*, product_variants(*)")
    .single();

  if (error) throw new Error(error.message);
  const { product_variants, ...rest } = data;
  return { ...rest, variants: product_variants || [] };
}

export async function getBackendReadiness() {
  const supabaseConfigured = isSupabaseConfigured();
  const adminEmails = getAllowedAdminEmails();
  const midtransConfigured = Boolean(
    isRealEnvValue(process.env.MIDTRANS_SERVER_KEY) &&
      isRealEnvValue(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY)
  );
  const midtransProduction =
    cleanEnvValue(process.env.MIDTRANS_IS_PRODUCTION) === "true";

  if (!supabaseConfigured) {
    return {
      supabaseConfigured: false,
      tablesReady: false,
      paymentEventsReady: false,
      bucketsReady: false,
      missingBuckets: ["product-images", "payment-proofs"],
      adminWhitelistConfigured: adminEmails.length > 0,
      adminEmailCount: adminEmails.length,
      midtransConfigured,
      midtransProduction,
      error: null,
    };
  }

  try {
    const admin = createSupabaseAdminClient();
    const [prodRes, evtRes, bucketRes] = await Promise.all([
      admin.from("products").select("id", { count: "exact", head: true }),
      admin.from("payment_events").select("id", { count: "exact", head: true }),
      admin.storage.listBuckets(),
    ]);

    const bucketNames = new Set((bucketRes.data || []).map((b) => b.name));
    const requiredBuckets = ["product-images", "payment-proofs"];
    const missingBuckets = requiredBuckets.filter((b) => !bucketNames.has(b));

    return {
      supabaseConfigured: true,
      tablesReady: !prodRes.error && prodRes.count !== null,
      paymentEventsReady: !evtRes.error && evtRes.count !== null,
      bucketsReady: !bucketRes.error && missingBuckets.length === 0,
      missingBuckets,
      adminWhitelistConfigured: adminEmails.length > 0,
      adminEmailCount: adminEmails.length,
      midtransConfigured,
      midtransProduction,
      error:
        prodRes.error?.message ||
        evtRes.error?.message ||
        bucketRes.error?.message ||
        null,
    };
  } catch (err) {
    return {
      supabaseConfigured: true,
      tablesReady: false,
      paymentEventsReady: false,
      bucketsReady: false,
      missingBuckets: ["product-images", "payment-proofs"],
      adminWhitelistConfigured: adminEmails.length > 0,
      adminEmailCount: adminEmails.length,
      midtransConfigured,
      midtransProduction,
      error: err.message,
    };
  }
}

export async function updateSiteSettings(payload) {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    db.settings = {
      ...db.settings,
      admin_whatsapp:
        payload.admin_whatsapp !== undefined
          ? String(payload.admin_whatsapp || "").trim()
          : db.settings.admin_whatsapp,
      bank_info:
        payload.bank_info !== undefined
          ? String(payload.bank_info || "").trim()
          : db.settings.bank_info,
      packing_fee:
        payload.packing_fee !== undefined
          ? Math.max(0, Math.round(Number(payload.packing_fee)))
          : db.settings.packing_fee,
      pirt_number:
        payload.pirt_number !== undefined
          ? String(payload.pirt_number || "").trim()
          : db.settings.pirt_number,
      halal_number:
        payload.halal_number !== undefined
          ? String(payload.halal_number || "").trim()
          : db.settings.halal_number,
    };
    await writeLocalDb(db);
    return db.settings;
  }

  const admin = createSupabaseAdminClient();
  const updates = { updated_at: new Date().toISOString() };
  if (payload.admin_whatsapp !== undefined)
    updates.admin_whatsapp = String(payload.admin_whatsapp || "").trim();
  if (payload.bank_info !== undefined)
    updates.bank_info = String(payload.bank_info || "").trim();
  if (payload.packing_fee !== undefined)
    updates.packing_fee = Math.max(0, Math.round(Number(payload.packing_fee)));
  if (payload.pirt_number !== undefined)
    updates.pirt_number = String(payload.pirt_number || "").trim();
  if (payload.halal_number !== undefined)
    updates.halal_number = String(payload.halal_number || "").trim();

  const { data, error } = await admin
    .from("site_settings")
    .update(updates)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
