type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function PageShell({ title, subtitle, children }: Props) {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}

      <section className="card">
        {children}
      </section>
    </main>
  );
}
