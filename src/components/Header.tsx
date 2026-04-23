"use client";

import Link from "next/link";
import React, { useEffect, useId, useRef, useState } from "react";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 24px",
        borderBottom: "1px solid var(--site-header-border)",
        gap: 18,
      }}
    >
      {/* Brand */}
      <Link href="/" style={brandStyle}>
        Event Clocks
      </Link>

      {/* Nav */}
      <nav
        aria-label="Primary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          marginRight: 28,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        <Link href="/today" style={topLinkStyle}>
          Today
        </Link>

        <Dropdown label="Tools">
          <Section title="Time">
            <MenuItem href="/timezone">Timezone Converter</MenuItem>
            <MenuItem href="/meeting-overlap">Meeting Overlap</MenuItem>
            <MenuItem href="/smpte-timecode">Timecode Converter</MenuItem>
            <MenuItem href="/unix-time">Unix Time Converter</MenuItem>
          </Section>

          <Divider />

          <Section title="Date Math">
            <MenuItem href="/business-days">Business Days</MenuItem>
            <MenuItem href="/date-difference">Date Difference</MenuItem>
            <MenuItem href="/week-number">Week Number</MenuItem>
            <MenuItem href="/holiday-long-weekend-planner">Holiday + Long Weekend Planner</MenuItem>
          </Section>

          <Divider />

          <Section title="Counters">
            <MenuItem href="/time-since">Time Since</MenuItem>
            <MenuItem href="/countdown-notes">Countdown Notes</MenuItem>
            <MenuItem href="/countdown-tasks">Countdown Tasks</MenuItem>
          </Section>

          <Divider />

          <Section title="Planners">
            <MenuItem href="/cruise">Cruise Planner</MenuItem>
            <MenuItem href="/wedding-plan">Wedding Planner</MenuItem>
            <MenuItem href="/tax-document-checklist">Tax Document Checklist</MenuItem>
          </Section>
        </Dropdown>

        <Link href="/about" style={topLinkStyle}>
          About
        </Link>

        <Dropdown label="More">
          <MenuItem href="/contact">Contact</MenuItem>
          <Divider />
          <MenuItem href="/privacy">Privacy</MenuItem>
          <MenuItem href="/terms">Terms</MenuItem>
        </Dropdown>
      </nav>
    </header>
  );
}

/* ---------------- Styles ---------------- */

const brandStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  color: "inherit",
  letterSpacing: "-0.02em",
  whiteSpace: "nowrap",
  opacity: 0.92,
};

const topLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  opacity: 0.72,
  padding: "6px 6px",
  transition: "opacity 140ms ease",
};

/* ---------------- Dropdown ---------------- */

function Dropdown({
  label,
  children,
  align = "right",
  offsetX = 0,
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
  offsetX?: number;
}) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const openMenu = () => {
    setOpen(true);
    if (detailsRef.current) detailsRef.current.open = true;
  };

  const onToggle = () => {
    const nowOpen = !!detailsRef.current?.open;
    setOpen(nowOpen);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: Event) => {
      const root = detailsRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (!target) return;

      if (!root.contains(target)) close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <details ref={detailsRef} style={{ position: "relative" }} onToggle={onToggle}>
      <summary
        style={summaryAppleStyle}
        aria-label={label}
        aria-expanded={open ? "true" : "false"}
        aria-controls={`menu-${id}`}
        onClick={(e) => {
          e.preventDefault();
          if (open) close();
          else openMenu();
        }}
      >
        {label}
      </summary>

      <div
        id={`menu-${id}`}
        style={{
          ...menuAppleStyle,
          ...(align === "left" ? { left: 0 } : { right: 0 }),
          transform: offsetX ? `translateX(${offsetX}px)` : undefined,
        }}
        role="menu"
        aria-label={label}
        onClick={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("a")) close();
        }}
      >
        {children}
      </div>
    </details>
  );
}

const summaryAppleStyle: React.CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  userSelect: "none",
  padding: "6px 6px",
  opacity: 0.72,
  transition: "opacity 140ms ease",
};

const menuAppleStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 12px)",
  width: 250,
  maxWidth: "calc(100vw - 32px)",
  color: "var(--site-menu-fg)",
  background: "var(--site-menu-bg)",
  border: "1px solid var(--site-menu-border)",
  borderRadius: 14,
  boxShadow: "0 18px 40px var(--site-menu-shadow)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  padding: 8,
  zIndex: 50,
};

/* ---------------- Menu items ---------------- */

function MenuItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      style={{
        display: "block",
        padding: "7px 10px",
        borderRadius: 8,
        textDecoration: "none",
        color: "var(--site-menu-fg)",
        fontSize: 13,
        fontWeight: 500,
        opacity: 0.9,
      }}
    >
      {children}
    </Link>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--site-menu-divider)",
        margin: "8px 6px",
      }}
    />
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "1px 2px" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: "var(--site-menu-muted)",
          padding: "4px 10px 2px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
