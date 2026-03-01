"use client";

import Link from "next/link";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 24px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
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
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        {/* One understated entry point */}
        <Dropdown label="Tools">
          <Section title="Time Tools">
            <MenuItem href="/timezone">Timezone Converter</MenuItem>
            <MenuItem href="/meeting-overlap">Meeting Overlap</MenuItem>
          </Section>

          <Divider />

          <Section title="Calculators">
            <MenuItem href="/business-days">Business Days</MenuItem>
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

/* ---------------- Dropdown (close on click-outside / navigate / Escape) ---------------- */

function Dropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);

  // Close helper (keeps <details> and state in sync)
  const close = () => {
    setOpen(false);
    if (detailsRef.current) detailsRef.current.open = false;
  };

  // Open helper
  const openMenu = () => {
    setOpen(true);
    if (detailsRef.current) detailsRef.current.open = true;
  };

  // Toggle via summary click
  const onToggle = () => {
    const nowOpen = !!detailsRef.current?.open;
    setOpen(nowOpen);
  };

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = detailsRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (!target) return;

      // If the click is outside the details element, close.
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
      document.removeEventListener("touchstart", onPointerDown as any);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Inject close-on-navigate into MenuItem children inside this dropdown
  const enhancedChildren = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      // If it's our MenuItem, add onNavigate
      // (We detect by displayName to avoid affecting other nodes.)
      const typeAny = child.type as any;
      const isMenuItem = typeAny?.displayName === "MenuItem";
      if (isMenuItem) {
        return React.cloneElement(child as any, { onNavigate: close });
      }

      // If it's a Section, walk one level deeper so MenuItems inside sections also close
      const isSection = typeAny?.displayName === "Section";
      if (isSection) {
        const sectionChildren = (child.props as any).children;
        const newSectionChildren = React.Children.map(sectionChildren, (c) => {
          if (!React.isValidElement(c)) return c;
          const t = c.type as any;
          if (t?.displayName === "MenuItem") {
            return React.cloneElement(c as any, { onNavigate: close });
          }
          return c;
        });

        return React.cloneElement(child as any, { children: newSectionChildren });
      }

      return child;
    });
  }, [children]);

  return (
    <details ref={detailsRef} style={{ position: "relative" }} onToggle={onToggle}>
      <summary
        style={summaryAppleStyle}
        aria-label={label}
        aria-expanded={open ? "true" : "false"}
        aria-controls={`menu-${id}`}
        onClick={(e) => {
          // Ensure our state stays synced and avoids weird toggles in some browsers
          // by controlling open/close based on current state.
          e.preventDefault();
          if (open) close();
          else openMenu();
        }}
      >
        {label}
      </summary>

      <div id={`menu-${id}`} style={menuAppleStyle} role="menu" aria-label={label}>
        {enhancedChildren}
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
  right: 0,
  top: "calc(100% + 12px)",
  minWidth: 260,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 14,
  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  padding: 10,
  zIndex: 50,
};

/* ---------------- Menu bits ---------------- */

function MenuItem({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={() => {
        // Close immediately on click (navigation will still happen)
        onNavigate?.();
      }}
      style={{
        display: "block",
        padding: "10px 10px",
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
        fontSize: 13,
        fontWeight: 500,
        opacity: 0.9,
      }}
    >
      {children}
    </Link>
  );
}
(MenuItem as any).displayName = "MenuItem";

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "rgba(0,0,0,0.07)",
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
    <div style={{ padding: "2px 2px" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          opacity: 0.55,
          padding: "6px 10px 4px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
(Section as any).displayName = "Section";