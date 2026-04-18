"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 44,
      background: "#0F1117",
      borderBottom: "1px solid #1E2130",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "linear-gradient(135deg, #9945FF, #14F195)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#fff",
        }}>S</div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
          color: "#E6EDF3", letterSpacing: "0.02em",
        }}>
          SOL<span style={{ color: "#6B7280" }}>/USD</span>
        </span>
        <span style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 3,
          background: "#1A2535", color: "#3B82F6",
          fontFamily: "var(--font-mono)", marginLeft: 2,
        }}>LIVE</span>
      </Link>

      {/* Spacer to balance logo */}
      <div style={{ width: 120 }} />
    </nav>
  );
}