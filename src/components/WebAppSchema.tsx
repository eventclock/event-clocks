type Props = {
  name: string;
  url: string;
  description: string;
  features?: string[];
};

export default function WebAppSchema({ name, url, description, features }: Props) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    ...(features && features.length > 0
      ? { featureList: features }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}