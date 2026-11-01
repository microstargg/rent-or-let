"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Marks each `[data-tick]` group as ticked the first time it scrolls into view, so its
 * lines are checked off one after another. One observer for the whole page.
 * Without JS, or with reduced motion, every tick is simply drawn (see veri.css).
 */
export function TickObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("v-js");
    const groups = Array.from(document.querySelectorAll<HTMLElement>("[data-tick]:not([data-ticked])"));
    if (!("IntersectionObserver" in window)) {
      groups.forEach((group) => group.setAttribute("data-ticked", ""));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-ticked", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0 }
    );
    groups.forEach((group) => observer.observe(group));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

/** Added before first paint so ticks above the fold don't flash drawn, then blank, then drawn. */
export const tickBootScript = `document.documentElement.classList.add('v-js')`;
