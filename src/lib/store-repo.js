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
import {
  removeStorageObjectQuietly,
  resolveOrderMediaUrls,
  uploadImageToBucket,
  validateImageUpload,
} from "./media-storage";
import {
  createMidtransSnapTransaction,
  extractMidtransReference,
  fetchMidtransTransactionStatus,
  formatMidtransPaymentMethod,
  getMidtransConfig,
  isMidtransClosedAttemptStatus,
  isMidtransPaidStatus,
  verifyMidtransSignature,
} from "./midtrans";

export { isSupabaseConfigured };

async function enrichOrderWithMedia(admin, row) {
  if (!row) return null;
  const { order_items, ...rest } = row;
  const mediaUrls = await resolveOrderMediaUrls(admin, row);
  return {
    ...rest,
    items: order_items || rest.items || [],
    ...mediaUrls,
  };
}

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
    return { order: await enrichOrderWithMedia(null, found), settings };
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

  return { order: await enrichOrderWithMedia(admin, order), settings };
}

export async function attachPaymentProof({
  orderCode,
  whatsapp,
  fileBuffer,
  mimeType,
}) {
  const cleanCode = String(orderCode || "").trim().toUpperCase();
  const cleanWa = normalizeWhatsapp(whatsapp);
  const { ext, toDataUrl } = validateImageUpload({ fileBuffer, mimeType });

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
    db.orders[idx].payment_proof_url = toDataUrl();
    if (
      ["menunggu_konfirmasi", "menunggu_pembayaran"].includes(
        db.orders[idx].status
      )
    ) {
      db.orders[idx].status = "verifikasi_bayar";
    }
    db.orders[idx].updated_at = new Date().toISOString();
    await writeLocalDb(db);
    return { order: await enrichOrderWithMedia(null, db.orders[idx]) };
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

  const storagePath = `${existing.order_code}-${Date.now()}.${ext}`;
  await uploadImageToBucket(admin, {
    bucket: "payment-proofs",
    objectPath: storagePath,
    fileBuffer,
    mimeType,
  });

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
  await removeStorageObjectQuietly(
    admin,
    "payment-proofs",
    existing.payment_proof_url
  );
  return { order: await enrichOrderWithMedia(admin, updated) };
}

/**
 * Marks a shipped order as received/completed by the buyer verified by order code + WhatsApp.
 */
export async function confirmOrderReceipt({ orderCode, whatsapp }) {
  const cleanCode = String(orderCode || "").trim().toUpperCase();
  const cleanWa = normalizeWhatsapp(whatsapp);
  if (!cleanCode || !cleanWa) {
    throw new Error("Kode pesanan dan nomor WhatsApp wajib disertakan.");
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
    const existing = db.orders[idx];
    if (existing.status === "selesai") {
      return { order: await enrichOrderWithMedia(null, existing) };
    }
    if (existing.status !== "dikirim") {
      throw new Error(
        "Konfirmasi penerimaan hanya tersedia setelah pesanan diserahkan ke kurir."
      );
    }
    db.orders[idx].status = "selesai";
    db.orders[idx].updated_at = new Date().toISOString();
    await writeLocalDb(db);
    return { order: await enrichOrderWithMedia(null, db.orders[idx]) };
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_code", cleanCode)
    .eq("customer_whatsapp", cleanWa)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!existing) {
    throw new Error("Pesanan tidak ditemukan untuk kode & nomor WhatsApp ini.");
  }
  if (existing.status === "selesai") {
    return { order: await enrichOrderWithMedia(admin, existing) };
  }
  if (existing.status !== "dikirim") {
    throw new Error(
      "Konfirmasi penerimaan hanya tersedia setelah pesanan diserahkan ke kurir."
    );
  }

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      status: "selesai",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return { order: await enrichOrderWithMedia(admin, updated) };
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
    email: String(email || "").trim().toLowerCase(),
    password: String(password || ""),
  });

  if (error) {
    const code = String(error.code || "").toLowerCase();
    const msg = String(error.message || "").toLowerCase();
    if (
      code === "invalid_credentials" ||
      msg.includes("invalid login credentials")
    ) {
      throw new Error("Email atau kata sandi admin salah.");
    }
    if (
      code === "email_not_confirmed" ||
      msg.includes("email not confirmed")
    ) {
      throw new Error(
        "Email admin belum terkonfirmasi di Supabase Auth. Buka Authentication -> Users di Supabase lalu konfirmasi user Anda."
      );
    }
    if (msg.includes("invalid path") || error.status === 404) {
      throw new Error(
        "URL Supabase di .env.local tidak valid (pastikan tanpa akhiran /rest/v1) atau server dev perlu direstart."
      );
    }
    throw new Error(`Gagal login Supabase Auth: ${error.message}`);
  }
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
    return Promise.all(
      db.orders.map((order) => enrichOrderWithMedia(null, order))
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return Promise.all(
    (data || []).map((row) => enrichOrderWithMedia(admin, row))
  );
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
    const shippingChanged =
      Number(shippingCost) !== Number(current.shipping_cost);

    db.orders[idx] = {
      ...current,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      status: nextStatus || current.status,
      tracking_number:
        nextTracking !== undefined ? nextTracking : current.tracking_number,
      ...(shippingChanged && !current.paid_at
        ? {
            payment_order_id: null,
            payment_snap_token: null,
            payment_redirect_url: null,
          }
        : {}),
      updated_at: new Date().toISOString(),
    };
    await writeLocalDb(db);
    return enrichOrderWithMedia(null, db.orders[idx]);
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
  const shippingChanged =
    Number(shippingCost) !== Number(current.shipping_cost);

  const updateFields = {
    shipping_cost: shippingCost,
    total_amount: totalAmount,
    status: nextStatus || current.status,
    tracking_number:
      nextTracking !== undefined ? nextTracking : current.tracking_number,
    updated_at: new Date().toISOString(),
  };
  if (shippingChanged && !current.paid_at) {
    updateFields.payment_order_id = null;
    updateFields.payment_snap_token = null;
    updateFields.payment_redirect_url = null;
  }

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update(updateFields)
    .eq("id", orderId)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return enrichOrderWithMedia(admin, updated);
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

/**
 * Uploads or replaces the store QRIS image in public storage bucket product-images.
 */
export async function uploadStoreQrisImage({ fileBuffer, mimeType }) {
  const { ext, toDataUrl } = validateImageUpload({ fileBuffer, mimeType });

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    db.settings = {
      ...db.settings,
      qris_image_url: toDataUrl(),
      updated_at: new Date().toISOString(),
    };
    await writeLocalDb(db);
    return { settings: db.settings };
  }

  const admin = createSupabaseAdminClient();
  const { data: prev } = await admin
    .from("site_settings")
    .select("qris_image_url")
    .eq("id", 1)
    .maybeSingle();

  const objectPath = `qris/qris-cimofood-${Date.now()}.${ext}`;
  const { publicUrl } = await uploadImageToBucket(admin, {
    bucket: "product-images",
    objectPath,
    fileBuffer,
    mimeType,
    isPublic: true,
  });

  const { data, error } = await admin
    .from("site_settings")
    .update({
      qris_image_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await removeStorageObjectQuietly(
    admin,
    "product-images",
    prev?.qris_image_url
  );
  return { settings: data };
}

/**
 * Removes the configured store QRIS image and deletes the previous object quietly.
 */
export async function clearStoreQrisImage() {
  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    db.settings = {
      ...db.settings,
      qris_image_url: null,
      updated_at: new Date().toISOString(),
    };
    await writeLocalDb(db);
    return { settings: db.settings };
  }

  const admin = createSupabaseAdminClient();
  const { data: prev } = await admin
    .from("site_settings")
    .select("qris_image_url")
    .eq("id", 1)
    .maybeSingle();

  const { data, error } = await admin
    .from("site_settings")
    .update({
      qris_image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await removeStorageObjectQuietly(
    admin,
    "product-images",
    prev?.qris_image_url
  );
  return { settings: data };
}

/**
 * Attaches an admin 4-layer packing proof photo to an order in private bucket payment-proofs.
 */
export async function attachPackingProof({ orderId, fileBuffer, mimeType }) {
  if (!orderId) {
    throw new Error("ID pesanan wajib disertakan.");
  }
  const { ext, toDataUrl } = validateImageUpload({ fileBuffer, mimeType });

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const idx = db.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error("Pesanan tidak ditemukan.");

    db.orders[idx].packing_proof_url = toDataUrl();
    db.orders[idx].updated_at = new Date().toISOString();
    await writeLocalDb(db);
    return { order: await enrichOrderWithMedia(null, db.orders[idx]) };
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (findErr || !existing) throw new Error("Pesanan tidak ditemukan.");

  const storagePath = `packing/${existing.order_code}-${Date.now()}.${ext}`;
  await uploadImageToBucket(admin, {
    bucket: "payment-proofs",
    objectPath: storagePath,
    fileBuffer,
    mimeType,
  });

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      packing_proof_url: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  await removeStorageObjectQuietly(
    admin,
    "payment-proofs",
    existing.packing_proof_url
  );
  return { order: await enrichOrderWithMedia(admin, updated) };
}

/**
 * Clears the 4-layer packing proof photo from an order.
 */
export async function clearPackingProof(orderId) {
  if (!orderId) {
    throw new Error("ID pesanan wajib disertakan.");
  }

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const idx = db.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error("Pesanan tidak ditemukan.");

    db.orders[idx].packing_proof_url = null;
    db.orders[idx].updated_at = new Date().toISOString();
    await writeLocalDb(db);
    return { order: await enrichOrderWithMedia(null, db.orders[idx]) };
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (findErr || !existing) throw new Error("Pesanan tidak ditemukan.");

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      packing_proof_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  await removeStorageObjectQuietly(
    admin,
    "payment-proofs",
    existing.packing_proof_url
  );
  return { order: await enrichOrderWithMedia(admin, updated) };
}

const PRE_PAID_ORDER_STATUSES = [
  "menunggu_konfirmasi",
  "menunggu_pembayaran",
  "verifikasi_bayar",
  "dibayar",
];

async function recordMidtransEventSafely(admin, orderId, payload) {
  const gatewayOrderId = String(payload?.order_id || "");
  const txStatus = String(payload?.transaction_status || "unknown");
  const txId = payload?.transaction_id ? String(payload.transaction_id) : null;
  if (!admin || !gatewayOrderId) return;

  try {
    let query = admin
      .from("payment_events")
      .select("id", { count: "exact", head: true })
      .eq("gateway_order_id", gatewayOrderId)
      .eq("transaction_status", txStatus);
    if (txId) {
      query = query.eq("transaction_id", txId);
    }
    const { count } = await query;
    if (count && count > 0) return;

    await admin.from("payment_events").insert({
      order_id: orderId,
      provider: "midtrans",
      gateway_order_id: gatewayOrderId,
      transaction_id: txId,
      transaction_status: txStatus,
      payment_type: payload?.payment_type ? String(payload.payment_type) : null,
      gross_amount: Math.max(0, Math.round(Number(payload?.gross_amount || 0))),
      payload: payload || {},
    });
  } catch {
    // Jangan gagalkan update status order utama bila pencatatan event log bermasalah
  }
}

async function applyMidtransNotificationToOrder({ admin, order, payload }) {
  const txStatus = String(payload?.transaction_status || "").toLowerCase();
  const isPaid = isMidtransPaidStatus(payload);
  const isClosedAttempt = isMidtransClosedAttemptStatus(txStatus);
  const paidAmount = Math.round(Number(payload?.gross_amount || 0));

  if (
    isPaid &&
    paidAmount > 0 &&
    paidAmount !== Math.round(Number(order.total_amount || 0))
  ) {
    throw new Error(
      `Nominal pembayaran Midtrans (${paidAmount}) tidak cocok dengan tagihan order (${order.total_amount}).`
    );
  }

  const nextPaymentMethod =
    formatMidtransPaymentMethod(payload) || order.payment_method || null;
  const nextPaymentReference =
    extractMidtransReference(payload) || order.payment_reference || null;

  const updates = {
    payment_provider: "midtrans",
    payment_method: nextPaymentMethod,
    payment_reference: nextPaymentReference,
    updated_at: new Date().toISOString(),
  };

  if (isPaid) {
    if (PRE_PAID_ORDER_STATUSES.includes(order.status)) {
      updates.status = "dikemas";
    }
    updates.paid_at = order.paid_at || new Date().toISOString();
  } else if (isClosedAttempt && !order.paid_at) {
    updates.payment_snap_token = null;
    updates.payment_redirect_url = null;
  }

  if (!admin) {
    const db = await readLocalDb();
    const idx = db.orders.findIndex((o) => o.id === order.id);
    if (idx === -1) throw new Error("Pesanan tidak ditemukan.");
    db.orders[idx] = { ...db.orders[idx], ...updates };
    await writeLocalDb(db);
    return {
      order: await enrichOrderWithMedia(null, db.orders[idx]),
      paid: isPaid,
      transactionStatus: txStatus,
    };
  }

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update(updates)
    .eq("id", order.id)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  await recordMidtransEventSafely(admin, order.id, payload);

  return {
    order: await enrichOrderWithMedia(admin, updated),
    paid: isPaid,
    transactionStatus: txStatus,
  };
}

/**
 * Creates or reuses a Midtrans Snap token for an order ready for payment.
 */
export async function createMidtransPaymentSession({
  orderCode,
  whatsapp,
  originUrl = "",
  forceNew = false,
}) {
  const cfg = getMidtransConfig();
  if (!cfg.configured) {
    throw new Error(
      "Kunci Midtrans belum dikonfigurasi pada environment variables."
    );
  }

  const { order } = await trackOrder(orderCode, whatsapp);
  if (order.status === "menunggu_konfirmasi") {
    throw new Error(
      "Admin belum mengonfirmasi stok dan ongkos kirim. Tunggu ongkir terisi sebelum membayar."
    );
  }
  if (order.status === "dibatalkan") {
    throw new Error("Pesanan ini sudah dibatalkan.");
  }
  if (["dibayar", "dikemas", "dikirim", "selesai"].includes(order.status)) {
    return {
      alreadyPaid: true,
      order,
      clientKey: cfg.clientKey,
      snapScriptUrl: cfg.snapScriptUrl,
    };
  }
  if (Number(order.total_amount || 0) <= 0) {
    throw new Error("Total tagihan pesanan belum valid.");
  }

  const admin = isSupabaseConfigured() ? createSupabaseAdminClient() : null;

  if (order.payment_order_id && order.payment_snap_token && !forceNew) {
    const existingStatus = await fetchMidtransTransactionStatus(
      order.payment_order_id
    );
    if (existingStatus) {
      if (isMidtransPaidStatus(existingStatus)) {
        const reconciled = await applyMidtransNotificationToOrder({
          admin,
          order,
          payload: existingStatus,
        });
        return {
          alreadyPaid: true,
          order: reconciled.order,
          clientKey: cfg.clientKey,
          snapScriptUrl: cfg.snapScriptUrl,
        };
      }
      const sameAmount =
        Math.round(Number(existingStatus.gross_amount || 0)) ===
        Math.round(Number(order.total_amount || 0));
      if (
        sameAmount &&
        !isMidtransClosedAttemptStatus(existingStatus.transaction_status)
      ) {
        return {
          alreadyPaid: false,
          token: order.payment_snap_token,
          redirectUrl: order.payment_redirect_url,
          gatewayOrderId: order.payment_order_id,
          clientKey: cfg.clientKey,
          snapScriptUrl: cfg.snapScriptUrl,
          order,
        };
      }
    } else {
      return {
        alreadyPaid: false,
        token: order.payment_snap_token,
        redirectUrl: order.payment_redirect_url,
        gatewayOrderId: order.payment_order_id,
        clientKey: cfg.clientKey,
        snapScriptUrl: cfg.snapScriptUrl,
        order,
      };
    }
  }

  const gatewayOrderId = `${order.order_code}-M${Date.now()
    .toString()
    .slice(-6)}`;
  const { token, redirectUrl } = await createMidtransSnapTransaction({
    order,
    gatewayOrderId,
    originUrl,
  });

  if (!admin) {
    const db = await readLocalDb();
    const idx = db.orders.findIndex((o) => o.id === order.id);
    if (idx !== -1) {
      db.orders[idx] = {
        ...db.orders[idx],
        payment_provider: "midtrans",
        payment_order_id: gatewayOrderId,
        payment_snap_token: token,
        payment_redirect_url: redirectUrl,
        updated_at: new Date().toISOString(),
      };
      await writeLocalDb(db);
      return {
        alreadyPaid: false,
        token,
        redirectUrl,
        gatewayOrderId,
        clientKey: cfg.clientKey,
        snapScriptUrl: cfg.snapScriptUrl,
        order: await enrichOrderWithMedia(null, db.orders[idx]),
      };
    }
  }

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({
      payment_provider: "midtrans",
      payment_order_id: gatewayOrderId,
      payment_snap_token: token,
      payment_redirect_url: redirectUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*, order_items(*)")
    .single();

  if (updateErr) throw new Error(updateErr.message);

  return {
    alreadyPaid: false,
    token,
    redirectUrl,
    gatewayOrderId,
    clientKey: cfg.clientKey,
    snapScriptUrl: cfg.snapScriptUrl,
    order: await enrichOrderWithMedia(admin, updated),
  };
}

/**
 * Verifies an incoming Midtrans HTTP webhook notification and transitions paid orders to dikemas.
 */
export async function processMidtransWebhook(payload) {
  const { configured, serverKey } = getMidtransConfig();
  if (!configured) {
    throw new Error("Midtrans Server Key belum dikonfigurasi.");
  }

  if (!verifyMidtransSignature(payload, serverKey)) {
    const err = new Error("Signature webhook Midtrans tidak valid.");
    err.statusCode = 403;
    throw err;
  }

  const gatewayOrderId = String(payload?.order_id || "").trim();
  if (!gatewayOrderId) {
    throw new Error("order_id tidak ditemukan di payload Midtrans.");
  }

  if (!isSupabaseConfigured()) {
    const db = await readLocalDb();
    const found = db.orders.find(
      (o) =>
        o.payment_order_id === gatewayOrderId || o.order_code === gatewayOrderId
    );
    if (!found) {
      return { ok: true, ignored: true, reason: "order_not_found" };
    }
    const result = await applyMidtransNotificationToOrder({
      admin: null,
      order: found,
      payload,
    });
    return { ok: true, ...result };
  }

  const admin = createSupabaseAdminClient();
  let { data: found, error } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("payment_order_id", gatewayOrderId)
    .maybeSingle();

  if (!found && !error) {
    const fallbackRes = await admin
      .from("orders")
      .select("*, order_items(*)")
      .eq("order_code", gatewayOrderId)
      .maybeSingle();
    found = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) throw new Error(error.message);
  if (!found) {
    return { ok: true, ignored: true, reason: "order_not_found" };
  }

  const enriched = await enrichOrderWithMedia(admin, found);
  const result = await applyMidtransNotificationToOrder({
    admin,
    order: enriched,
    payload,
  });
  return { ok: true, ...result };
}

/**
 * Actively queries Midtrans Core API transaction status for buyer checkout reconciliation (ideal for localhost).
 */
export async function syncMidtransPaymentStatus({ orderCode, whatsapp }) {
  const { order } = await trackOrder(orderCode, whatsapp);
  if (!order.payment_order_id) {
    return { synced: false, order, transactionStatus: null };
  }

  const remoteStatus = await fetchMidtransTransactionStatus(
    order.payment_order_id
  );
  if (!remoteStatus) {
    return { synced: false, order, transactionStatus: null };
  }

  const admin = isSupabaseConfigured() ? createSupabaseAdminClient() : null;
  const reconciled = await applyMidtransNotificationToOrder({
    admin,
    order,
    payload: remoteStatus,
  });

  return {
    synced: true,
    order: reconciled.order,
    paid: reconciled.paid,
    transactionStatus: reconciled.transactionStatus,
  };
}
