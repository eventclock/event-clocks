import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const citiesPath = process.argv[2] ?? "/tmp/cities15000.txt";
const adminPath = process.argv[3] ?? "/tmp/admin1CodesASCII.txt";
const outPath = resolve(root, "src/lib/timezones/timezone-cities.generated.json");

const countries = new Intl.DisplayNames(["en"], { type: "region" });

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const adminNames = new Map();
for (const line of readFileSync(adminPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const [key, name, asciiName] = line.split("\t");
  if (key && (asciiName || name)) adminNames.set(key, asciiName || name);
}

const seen = new Map();

for (const line of readFileSync(citiesPath, "utf8").split("\n")) {
  if (!line.trim()) continue;

  const parts = line.split("\t");
  const name = parts[1];
  const asciiName = parts[2] || name;
  const alternateNames = parts[3] || "";
  const latitude = Number(parts[4]);
  const longitude = Number(parts[5]);
  const countryCode = parts[8];
  const admin1Code = parts[10];
  const population = Number(parts[14]) || 0;
  const timeZone = parts[17];

  if (!asciiName || !countryCode || !timeZone || population < 15000) continue;

  const adminName = adminNames.get(`${countryCode}.${admin1Code}`) || "";
  const countryName = countries.of(countryCode) || countryCode;
  const label = [asciiName, adminName, countryName].filter(Boolean).join(", ");

  const aliases = new Set([name, asciiName]);
  for (const alternate of alternateNames.split(",")) {
    const trimmed = alternate.trim();
    if (trimmed && trimmed.length <= 64) aliases.add(trimmed);
  }

  const item = {
    i: parts[0],
    n: asciiName,
    a: adminName,
    c: countryCode,
    cn: countryName,
    l: label,
    t: timeZone,
    p: population,
    lat: Number.isFinite(latitude) ? latitude : null,
    lon: Number.isFinite(longitude) ? longitude : null,
    s: Array.from(aliases)
      .map(normalize)
      .filter(Boolean)
      .slice(0, 24),
  };

  const key = `${normalize(asciiName)}:${countryCode}:${admin1Code}:${timeZone}`;
  const existing = seen.get(key);
  if (!existing || item.p > existing.p) seen.set(key, item);
}

const data = Array.from(seen.values()).sort((a, b) => {
  if (b.p !== a.p) return b.p - a.p;
  return a.l.localeCompare(b.l, "en");
});

writeFileSync(
  outPath,
  `${JSON.stringify({
    source: "GeoNames cities15000, admin1CodesASCII",
    generatedAt: new Date().toISOString(),
    license: "GeoNames data is licensed under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/",
    count: data.length,
    cities: data,
  })}\n`,
);

console.log(`Wrote ${data.length} cities to ${outPath}`);
