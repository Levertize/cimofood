"use client";

import { useMemo, useSyncExternalStore } from "react";

const RECENT_ORDERS_KEY = "cimofood_recent_orders_v1";
const RECENT_ORDERS_EVENT = "cimofood-recent-orders-change";
const MAX_RECENT_ORDERS = 8;

function subscribeRecentOrders(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(RECENT_ORDERS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(RECENT_ORDERS_EVENT, callback);
  };
}

function getRecentOrdersSnapshot() {
  try {
    return window.localStorage.getItem(RECENT_ORDERS_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function getServerRecentOrdersSnapshot() {
  return "[]";
}

function writeRecentOrders(nextList) {
  try {
    window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new Event(RECENT_ORDERS_EVENT));
  } catch {
    // Abaikan jika penyimpanan lokal tidak tersedia
  }
}

function readParsedRecentOrders() {
  try {
    const raw = getRecentOrdersSnapshot();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Inserts or updates a buyer order entry in localStorage for quick client-side status tracking.
 */
export function upsertRecentOrder(order, paymentPreference) {
  if (!order?.order_code || !order?.customer_whatsapp) return;
  const code = String(order.order_code).trim().toUpperCase();
  const existing = readParsedRecentOrders();
  const previous = existing.find((item) => item.orderCode === code);

  const entry = {
    orderCode: code,
    customerWhatsapp: String(order.customer_whatsapp).trim(),
    customerName: order.customer_name || previous?.customerName || "",
    status: order.status || previous?.status || "menunggu_konfirmasi",
    totalAmount: Number(order.total_amount ?? previous?.totalAmount ?? 0),
    shippingCost: Number(order.shipping_cost ?? previous?.shippingCost ?? 0),
    courier: order.courier || previous?.courier || "",
    trackingNumber: order.tracking_number || previous?.trackingNumber || null,
    paymentPreference:
      paymentPreference || previous?.paymentPreference || "midtrans_auto",
    updatedAt: order.updated_at || new Date().toISOString(),
  };

  const next = [entry, ...existing.filter((item) => item.orderCode !== code)].slice(
    0,
    MAX_RECENT_ORDERS
  );
  writeRecentOrders(next);
}

/**
 * Removes an order code from local browser tracking history.
 */
export function removeRecentOrder(orderCode) {
  const cleanCode = String(orderCode || "").trim().toUpperCase();
  const existing = readParsedRecentOrders();
  writeRecentOrders(existing.filter((item) => item.orderCode !== cleanCode));
}

/**
 * React hook returning saved client orders ordered from newest to oldest.
 */
export function useRecentOrders() {
  const raw = useSyncExternalStore(
    subscribeRecentOrders,
    getRecentOrdersSnapshot,
    getServerRecentOrdersSnapshot
  );

  return useMemo(() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [raw]);
}

/**
 * Silently refreshes live statuses from the track endpoint for locally stored orders.
 */
export async function syncRecentOrderStatuses(orderRefs) {
  if (!Array.isArray(orderRefs) || orderRefs.length === 0) return [];
  const targets = orderRefs.slice(0, 5);
  const results = await Promise.allSettled(
    targets.map(async (item) => {
      const res = await fetch(
        `/api/orders/track?code=${encodeURIComponent(
          item.orderCode
        )}&wa=${encodeURIComponent(item.customerWhatsapp)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.order) {
        upsertRecentOrder(data.order, item.paymentPreference);
        return data.order;
      }
      return null;
    })
  );
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);
}
