"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/katalog", label: "Katalog" },
  { href: "/cek-pesanan", label: "Cek Pesanan" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { totalCount, setDrawerOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
        >
          CimoFood
        </Link>

        <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-11 inline-flex items-center rounded-md px-3.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-sand text-ink underline decoration-2 underline-offset-4"
                    : "text-muted hover:bg-sand hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`Buka keranjang belanja, ${totalCount} item`}
            className="min-h-11 inline-flex items-center gap-1.5 rounded-full border border-control bg-surface px-3 text-xs font-semibold text-ink hover:bg-sand sm:gap-2 sm:px-4 sm:text-sm"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M6 6L5 3H2" />
            </svg>
            <span>Keranjang</span>
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-chili px-1.5 py-0.5 text-xs font-bold text-white tabular-nums sm:min-w-6">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-panel"
            className="md:hidden min-h-11 inline-flex items-center gap-1.5 rounded-md border border-control bg-surface px-3 text-xs font-semibold text-ink hover:bg-sand sm:text-sm"
          >
            <span>{mobileMenuOpen ? "Tutup" : "Menu"}</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          id="mobile-nav-panel"
          aria-label="Navigasi mobile"
          className="md:hidden border-t border-subtle bg-surface px-4 py-3"
        >
          <ul className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`min-h-11 flex items-center rounded-md px-3 text-base font-semibold ${
                      active ? "bg-sand text-ink" : "text-muted hover:bg-sand"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
