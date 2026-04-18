"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/forecast", label: "Forecast" },
  { href: "/predict-date", label: "Predict" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
      style={{
        background: "rgba(15, 15, 26, 0.80)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(42, 42, 69, 0.6)",
      }}
    >
      <Link href="/" className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #10B981)" }}
        >
          S
        </div>
        <span
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--sol-text)" }}
        >
          Sol<span style={{ color: "#8B5CF6" }}>Cast</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 rounded-full text-sm transition-all duration-200"
              style={
                active
                  ? {
                      background: "rgba(139, 92, 246, 0.15)",
                      border: "1px solid rgba(139, 92, 246, 0.35)",
                      color: "#A78BFA",
                      fontWeight: 500,
                    }
                  : {
                      border: "1px solid transparent",
                      color: "var(--sol-muted)",
                    }
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}