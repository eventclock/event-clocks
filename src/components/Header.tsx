import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 24px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
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
        }}
      >
        Event Clocks
      </Link>

      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          gap: "18px",
          fontSize: 13,
          fontWeight: 600,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <Link href="/timezone" style={linkStyle}>
          Timezone Converter
        </Link>

        <Link href="/meeting-overlap" style={linkStyle}>
          Meeting Overlap
        </Link>

        {/* NEW */}
        <Link href="/business-days" style={linkStyle}>
          Business Days
        </Link>

        <Link href="/cruise" style={linkStyle}>
          Cruise Planner
        </Link>

        <Link href="/about" style={linkStyle}>
          About
        </Link>

        <Link href="/privacy" style={linkStyle}>
          Privacy
        </Link>

        <Link href="/terms" style={linkStyle}>
          Terms
        </Link>

        <Link href="/contact" style={linkStyle}>
          Contact
        </Link>
      </nav>
    </header>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  opacity: 0.75,
  transition: "opacity 120ms ease",
};
