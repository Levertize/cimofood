import crypto from "node:crypto";
import { cleanEnvValue, isRealEnvValue } from "./supabase/config";

/**
 * Reads and normalizes Midtrans Sandbox/Production configuration from environment variables.
 */
export function getMidtransConfig() {
  const isProduction =
    cleanEnvValue(process.env.MIDTRANS_IS_PRODUCTION) === "true";
  const clientKey = cleanEnvValue(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
  const serverKey = cleanEnvValue(process.env.MIDTRANS_SERVER_KEY);
  const configured = isRealEnvValue(clientKey) && isRealEnvValue(serverKey);

  const snapBaseUrl = isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
  const apiBaseUrl = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  return {
    isProduction,
    clientKey,
    serverKey,
    configured,
    snapBaseUrl,
    apiBaseUrl,
    snapScriptUrl: `${snapBaseUrl}/snap/snap.js`,
  };
}

/**
 * Exposes strictly non-secret Midtrans client configuration for browser Snap checkout.
 */
export function getPublicMidtransConfig() {
  const { configured, clientKey, snapScriptUrl, isProduction } =
    getMidtransConfig();
  return {
    enabled: configured,
    clientKey: configured ? clientKey : "",
    snapScriptUrl,
    isProduction,
  };
}

function buildBasicAuthHeader(serverKey) {
  const encoded = Buffer.from(`${serverKey}:`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Verifies a Midtrans HTTP notification SHA-512 signature using timing-safe comparison.
 */
export function verifyMidtransSignature(payload, serverKey) {
  const orderId = String(payload?.order_id || "");
  const statusCode = String(payload?.status_code || "");
  const grossAmount = String(payload?.gross_amount || "");
  const incomingSig = String(payload?.signature_key || "").toLowerCase();

  if (!orderId || !statusCode || !grossAmount || !incomingSig || !serverKey) {
    return false;
  }

  const rawInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedSig = crypto
    .createHash("sha512")
    .update(rawInput)
    .digest("hex")
    .toLowerCase();

  const incomingBuf = Buffer.from(incomingSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (incomingBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(incomingBuf, expectedBuf);
}

/**
 * Returns true when a Midtrans transaction payload represents settled funds ready to pack.
 */
export function isMidtransPaidStatus(payload) {
  const status = String(payload?.transaction_status || "").toLowerCase();
  const fraud = String(payload?.fraud_status || "").toLowerCase();
  if (status === "settlement") return true;
  if (status === "capture") {
    return !fraud || fraud === "accept";
  }
  return false;
}

/**
 * Returns true when a Midtrans payment attempt has expired or been canceled/denied.
 */
export function isMidtransClosedAttemptStatus(transactionStatus) {
  const normalized = String(transactionStatus || "").toLowerCase();
  return ["deny", "cancel", "expire", "failure"].includes(normalized);
}

/**
 * Formats a concise human-readable payment method label from a Midtrans notification/status payload.
 */
export function formatMidtransPaymentMethod(payload) {
  const type = String(payload?.payment_type || "").toLowerCase();
  if (!type) return null;
  if (Array.isArray(payload?.va_numbers) && payload.va_numbers[0]?.bank) {
    return `${String(payload.va_numbers[0].bank).toUpperCase()} Virtual Account`;
  }
  if (payload?.permata_va_number) return "Permata Virtual Account";
  if (payload?.bill_key && payload?.biller_code) return "Mandiri Bill Payment";
  if (type === "qris") {
    return payload?.acquirer ? `QRIS (${String(payload.acquirer)})` : "QRIS";
  }
  if (type === "gopay") return "GoPay";
  if (type === "shopeepay") return "ShopeePay";
  if (type === "credit_card") return "Kartu Kredit/Debit";
  return type;
}

/**
 * Extracts a bank VA number, QRIS acquirer ref, or Midtrans transaction reference.
 */
export function extractMidtransReference(payload) {
  if (Array.isArray(payload?.va_numbers) && payload.va_numbers[0]?.va_number) {
    return `${String(payload.va_numbers[0].bank || "VA").toUpperCase()} ${
      payload.va_numbers[0].va_number
    }`;
  }
  if (payload?.permata_va_number) {
    return `PERMATA ${payload.permata_va_number}`;
  }
  if (payload?.bill_key) {
    return `${payload.biller_code || ""} / ${payload.bill_key}`.trim();
  }
  return payload?.transaction_id ? String(payload.transaction_id) : null;
}

function buildSnapItemDetails(order, totalAmount) {
  const rawItems = Array.isArray(order.items) ? order.items : [];
  if (rawItems.length === 0) return null;

  const mapped = rawItems.map((it, idx) => ({
    id: String(it.variant_id || `item-${idx + 1}`).slice(0, 50),
    price: Math.max(0, Math.round(Number(it.unit_sell_price || 0))),
    quantity: Math.max(1, Math.round(Number(it.quantity || 1))),
    name: `${it.product_name || "Cimoring"} (${it.size_label || ""})`.trim().slice(0, 50),
  }));

  const packingFee = Math.max(0, Math.round(Number(order.packing_fee || 0)));
  if (packingFee > 0) {
    mapped.push({
      id: "packing-4-lapis",
      price: packingFee,
      quantity: 1,
      name: "Packing Aman 4 Lapis",
    });
  }

  const shippingCost = Math.max(0, Math.round(Number(order.shipping_cost || 0)));
  if (shippingCost > 0) {
    mapped.push({
      id: "shipping-cost",
      price: shippingCost,
      quantity: 1,
      name: `Ongkos Kirim (${order.courier || "Ekspedisi"})`.slice(0, 50),
    });
  }

  const itemSum = mapped.reduce((acc, it) => acc + it.price * it.quantity, 0);
  return itemSum === totalAmount ? mapped : null;
}

/**
 * Creates a Midtrans Snap transaction token and redirect URL for a confirmed order.
 */
export async function createMidtransSnapTransaction({
  order,
  gatewayOrderId,
  originUrl = "",
}) {
  const { configured, serverKey, snapBaseUrl } = getMidtransConfig();
  if (!configured) {
    throw new Error(
      "Kunci Midtrans belum dikonfigurasi pada environment variables."
    );
  }

  const grossAmount = Math.round(Number(order.total_amount || 0));
  if (grossAmount <= 0) {
    throw new Error("Total tagihan pesanan harus lebih besar dari Rp 0.");
  }

  const body = {
    transaction_details: {
      order_id: gatewayOrderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: String(order.customer_name || "Pembeli CimoFood").slice(0, 50),
      phone: String(order.customer_whatsapp || "").slice(0, 20),
    },
  };

  const itemDetails = buildSnapItemDetails(order, grossAmount);
  if (itemDetails) {
    body.item_details = itemDetails;
  }

  if (originUrl && /^https?:\/\//i.test(originUrl)) {
    const cleanOrigin = originUrl.replace(/\/$/, "");
    body.callbacks = {
      finish: `${cleanOrigin}/cek-pesanan?code=${encodeURIComponent(
        order.order_code
      )}&wa=${encodeURIComponent(order.customer_whatsapp)}&payment=finish`,
    };
  }

  const response = await fetch(`${snapBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: buildBasicAuthHeader(serverKey),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.token) {
    const detail = Array.isArray(data?.error_messages)
      ? data.error_messages.join("; ")
      : data?.status_message || `HTTP ${response.status}`;
    throw new Error(`Gagal membuat transaksi Midtrans Snap: ${detail}`);
  }

  return {
    token: data.token,
    redirectUrl: data.redirect_url || null,
  };
}

/**
 * Fetches live transaction status from Midtrans Core API /v2/{order_id}/status.
 */
export async function fetchMidtransTransactionStatus(gatewayOrderId) {
  const { configured, serverKey, apiBaseUrl } = getMidtransConfig();
  if (!configured || !gatewayOrderId) return null;

  const response = await fetch(
    `${apiBaseUrl}/v2/${encodeURIComponent(gatewayOrderId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: buildBasicAuthHeader(serverKey),
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) return null;
  if (String(data?.status_code || "") === "404") return null;
  return data;
}
