"use client";

import { useRef, useSyncExternalStore } from "react";

const THEME_EVENT = "cimofood-theme-change";
const STORAGE_KEY = "cimofood_theme";

function subscribeTheme(callback) {
  function onStorage(e) {
    if (!e.key || e.key === STORAGE_KEY) callback();
  }
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getThemeSnapshot() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getThemeServerSnapshot() {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );
  const timerRef = useRef(0);
  const isDark = theme === "dark";

  function handleToggle(e) {
    const nextTheme = isDark ? "light" : "dark";
    const root = document.documentElement;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);

    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.classList.add("theme-transitioning");

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 600);

    function applyTheme() {
      root.dataset.theme = nextTheme;
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // Abaikan jika penyimpanan lokal dibatasi browser
      }
      window.dispatchEvent(new Event(THEME_EVENT));
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (typeof document.startViewTransition === "function" && !reduceMotion) {
      document.startViewTransition(() => applyTheme());
    } else {
      applyTheme();
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      aria-pressed={isDark}
      title={isDark ? "Tema Terang" : "Tema Gelap"}
      className="relative min-h-11 min-w-11 inline-flex items-center justify-center rounded-full border border-control bg-surface text-ink hover:bg-sand overflow-hidden"
    >
      {/* Ikon Matahari (Terang) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`transition-all duration-500 ease-out ${
          isDark
            ? "scale-0 -rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100"
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>

      {/* Ikon Bulan Sabit (Gelap) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`absolute transition-all duration-500 ease-out ${
          isDark
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 rotate-90 opacity-0"
        }`}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
