"use client";

import { useEffect, useRef } from "react";
import { DoodleBackdrop } from "./DoodleBackdrop";

export function ScrollTrack({
  id,
  className = "",
  stickyClassName = "",
  onMilestone,
  children,
}) {
  const trackRef = useRef(null);
  const stickyRef = useRef(null);
  const milestoneRef = useRef(onMilestone);

  useEffect(() => {
    milestoneRef.current = onMilestone;
  });

  useEffect(() => {
    const trackEl = trackRef.current;
    const stickyEl = stickyRef.current;
    if (!trackEl || !stickyEl) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      stickyEl.style.setProperty("--p", "1");
      milestoneRef.current?.(1);
      return;
    }

    let rafId = 0;

    function updateProgress() {
      rafId = 0;
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (!isDesktop) {
        stickyEl.style.setProperty("--p", "0");
        return;
      }

      const rect = trackEl.getBoundingClientRect();
      const headerOffset = 68;
      const scrollable = Math.max(
        1,
        trackEl.offsetHeight - window.innerHeight + headerOffset
      );
      const raw = (headerOffset - rect.top) / scrollable;
      const p = Math.min(1, Math.max(0, raw));
      stickyEl.style.setProperty("--p", p.toFixed(4));
      milestoneRef.current?.(p);
    }

    function onScrollOrResize() {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    }

    updateProgress();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <section id={id} ref={trackRef} className={className}>
      <div
        ref={stickyRef}
        className={`relative overflow-hidden ${stickyClassName}`}
        style={{ "--p": 0 }}
      >
        <DoodleBackdrop />
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </section>
  );
}
