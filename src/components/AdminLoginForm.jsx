"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AdminLoginForm({ isPreviewMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk.");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-subtle bg-surface p-6 sm:p-8 space-y-6">
        <div>
          <Link
            href="/"
            className="text-xs font-semibold text-muted hover:text-ink underline-offset-4 hover:underline"
          >
            Kembali ke Beranda CimoFood
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Masuk Dasbor Admin
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Khusus pengelola CimoFood untuk cek ongkir, verifikasi bukti bayar,
            kelola stok, dan rekap laporan penjualan.
          </p>
        </div>

        {isPreviewMode && (
          <div className="rounded-xl border border-amber-bg bg-sand p-4 text-xs leading-relaxed text-ink">
            <strong>Mode Preview Lokal:</strong> Supabase belum disambungkan di{" "}
            <code>.env.local</code>. Klik tombol masuk di bawah untuk menguji
            dasbor dengan penyimpanan lokal sementara.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-chili bg-canvas p-3 text-sm font-medium text-chili-hover"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isPreviewMode && (
            <>
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-sm font-semibold text-ink"
                >
                  Email Admin
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@email.com"
                  className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-semibold text-ink"
                >
                  Kata Sandi
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-full bg-chili px-5 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
          >
            {loading
              ? "Memproses..."
              : isPreviewMode
              ? "Masuk Mode Preview Admin"
              : "Masuk Dasbor"}
          </button>
        </form>
      </div>
    </div>
  );
}
