import Link from "next/link";
import React from "react";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 24px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        gap: 16,
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        style={{
          fontSize: 15,
          fontWeight: 700,
          textDecoration: "none",
          color: "inherit",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        Event Clocks
      </Link>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 13,
          fontWeight: 600,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {/* Core tools only (keep this short) */}
        <Link href="/timezone" style={linkStyle}>
          Timezone
        </Link>

        <Link href="/meeting-overlap" style={linkStyle}>
          Overlap
        </Link>

        <Link href="/business-days" style={linkStyle}>
          Business Days
        </Link>

        <Link href="/cruise" style={linkStyle}>
          Cruise
        </Link>

        {/* NEW */}
        <Link href="/wedding-plan" style={linkStyle}>
          Wedding
        </Link>

        {/* Everything else goes into a dropdown */}
        <details style={{ position: "relative" }}>
          <summary style={summaryStyle} aria-label="More links">
            More
            <span aria-hidden="true" style={{ opacity: 0.6 }}>
              ▾
            </span>
          </summary>

          <div style={menuStyle} role="menu" aria-label="More">
            <Link href="/about" style={menuItemStyle} role="menuitem">
              About
            </Link>
            <Link href="/contact" style={menuItemStyle} role="menuitem">
              Contact
            </Link>
            <div style={menuDividerStyle} />
            <Link href="/privacy" style={menuItemStyle} role="menuitem">
              Privacy
            </Link>
            <Link href="/terms" style={menuItemStyle} role="menuitem">
              Terms
            </Link>
          </div>
        </details>
      </nav>
    </header>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  opacity: 0.78,
  padding: "6px 8px",
  borderRadius: 10,
  transition: "opacity 120ms ease, background 120ms ease",
};

const summaryStyle: React.CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(255,255,255,0.55)",
  opacity: 0.85,
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 10px)",
  minWidth: 170,
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 14,
  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
  padding: 8,
  zIndex: 50,
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 10px",
  borderRadius: 10,
  textDecoration: "none",
  color: "inherit",
  opacity: 0.9,
};

const menuDividerStyle: React.CSSProperties = {
  height: 1,
  background: "rgba(0,0,0,0.08)",
  margin: "6px 6px",
};