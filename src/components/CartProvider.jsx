"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/pricing";

const STORAGE_KEY = "cimofood_cart_v1";
const CART_EVENT = "cimofood-cart-change";
const CartContext = createContext(null);

function subscribeCart(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(CART_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CART_EVENT, callback);
  };
}

function getCartSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function getServerCartSnapshot() {
  return "[]";
}

function writeCartStorage(nextItems) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    window.dispatchEvent(new Event(CART_EVENT));
  } catch {
    // Abaikan jika penyimpanan browser penuh atau diblokir
  }
}

export function CartProvider({ children }) {
  const rawCart = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerCartSnapshot
  );

  const items = useMemo(() => {
    try {
      const parsed = JSON.parse(rawCart);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [rawCart]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!drawerOpen) return;
    lastFocusedRef.current = document.activeElement;
    const panel = drawerRef.current;
    const closeBtn = panel?.querySelector("button[data-close-drawer]");
    closeBtn?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (lastFocusedRef.current instanceof HTMLElement) {
        lastFocusedRef.current.focus();
      }
    };
  }, [drawerOpen]);

  function addItem(product, variant, qty = 1) {
    const existing = items.find((it) => it.variantId === variant.id);
    const next = existing
      ? items.map((it) =>
          it.variantId === variant.id
            ? { ...it, quantity: Math.min(99, it.quantity + qty) }
            : it
        )
      : [
          ...items,
          {
            variantId: variant.id,
            productId: product.id,
            productName: product.name,
            sizeLabel: variant.size_label,
            weightGrams: variant.weight_grams,
            sellPrice: variant.sell_price,
            quantity: qty,
          },
        ];
    writeCartStorage(next);
    setDrawerOpen(true);
  }

  function updateQuantity(variantId, nextQty) {
    const next =
      nextQty <= 0
        ? items.filter((it) => it.variantId !== variantId)
        : items.map((it) =>
            it.variantId === variantId
              ? { ...it, quantity: Math.min(99, nextQty) }
              : it
          );
    writeCartStorage(next);
  }

  function clearCart() {
    writeCartStorage([]);
  }

  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce(
    (sum, it) => sum + it.sellPrice * it.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        hydrated: true,
        totalCount,
        subtotal,
        drawerOpen,
        setDrawerOpen,
        addItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-ink/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keranjang Belanja CimoFood"
            className="relative z-10 flex h-full w-full max-w-md flex-col bg-surface border-l border-control shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
              <h2 className="font-display text-xl font-semibold text-ink">
                Keranjang Belanja ({totalCount})
              </h2>
              <button
                type="button"
                data-close-drawer
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup keranjang"
                className="min-h-11 min-w-11 rounded-md border border-control px-3 text-sm font-medium text-ink hover:bg-sand"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="rounded-xl border border-subtle bg-canvas p-6 text-center">
                  <p className="font-medium text-ink">
                    Keranjang masih kosong.
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Pilih varian rasa dan ukuran Cimoring di katalog untuk mulai
                    memesan.
                  </p>
                  <Link
                    href="/katalog"
                    onClick={() => setDrawerOpen(false)}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-chili px-5 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover"
                  >
                    Buka Katalog Cimoring
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.variantId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-subtle bg-canvas p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {item.productName}
                        </p>
                        <p className="text-sm text-muted">
                          {item.sizeLabel} ({formatRupiah(item.sellPrice)})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                          aria-label={`Kurangi jumlah ${item.productName}`}
                          className="min-h-11 min-w-11 rounded-md border border-control bg-surface font-semibold text-ink hover:bg-sand"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                          aria-label={`Tambah jumlah ${item.productName}`}
                          className="min-h-11 min-w-11 rounded-md border border-control bg-surface font-semibold text-ink hover:bg-sand"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-subtle bg-canvas px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Subtotal Produk</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Biaya Packing 4 Lapis</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatRupiah(2000)}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Ongkir ekspedisi dikonfirmasi admin via WhatsApp sebelum
                  pembayaran.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="min-h-11 rounded-md border border-control bg-surface px-4 text-sm font-medium text-ink hover:bg-sand"
                  >
                    Kosongkan
                  </button>
                  <Link
                    href="/checkout"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 min-h-11 inline-flex items-center justify-center rounded-full bg-chili px-5 text-sm font-semibold text-white hover:bg-chili-hover"
                  >
                    Lanjut ke Checkout
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipanggil di dalam CartProvider.");
  return ctx;
}
