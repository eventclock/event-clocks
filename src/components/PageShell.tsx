type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentClassName?: string;
  mainClassName?: string;
};

export default function PageShell({
  title,
  subtitle,
  children,
  contentClassName,
  mainClassName,
}: Props) {
  return (
    <main
      className={mainClassName}
      style={
        {
          "--page-shell-max-width": "980px",
          maxWidth: "var(--page-shell-max-width)",
          margin: "0 auto",
          padding: 24,
        } as React.CSSProperties
      }
    >
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}

      <section className={contentClassName ? `card ${contentClassName}` : "card"}>
        {children}
      </section>
    </main>
  );
}
