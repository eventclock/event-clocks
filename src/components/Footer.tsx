export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 28,
        paddingTop: 16,
        borderTop: "1px solid rgba(255,255,255,0.12)",
        opacity: 0.9,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <div style={{ opacity: 0.75 }}>
          © {new Date().getFullYear()} Event Clocks
        </div>

        <nav style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <a href="/about" style={linkStyle}>About</a>
          <a href="/privacy" style={linkStyle}>Privacy</a>
          <a href="/terms" style={linkStyle}>Terms</a>
          <a href="/contact" style={linkStyle}>Contact</a>
        </nav>
      </div>
    </footer>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.04)",
};
