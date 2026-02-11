import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        textAlign: "left",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          color: "inherit",
          opacity: 0.85,
        }}
      >
        Home
      </Link>
    </header>
  );
}
