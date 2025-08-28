"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Library, Sparkles, ImageIcon, User, Search } from "lucide-react";
import { useEffect, useRef } from "react";

const navItems = [
  { href: "/", icon: Sparkles, label: "Generate" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/stories", icon: ImageIcon, label: "Stories" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement | null>(null);

  // Keep --nav-height in sync with actual nav height for responsive/adaptive UIs
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty("--nav-height", `${Math.round(h)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <nav
      ref={ref}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 h-20 w-[95%] max-w-md rounded-full border border-white/10 bg-black/30 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          if (item.href === "/") {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-16 w-16 flex-col items-center justify-center rounded-full transition-all duration-300 -mt-8 bg-gradient-to-r from-primary to-green-400 font-bold text-primary-foreground hover:opacity-90 shadow-lg",
                )}
                aria-label={item.label}
              >
                <item.icon className="h-7 w-7" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center rounded-full transition-all duration-300",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-white/10 hover:text-white",
              )}
              aria-label={item.label}
            >
              <item.icon className="h-6 w-6" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
