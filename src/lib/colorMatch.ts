import sharp from "sharp";

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type Hsl = {
  h: number;
  s: number;
  l: number;
};

export type PaletteEntry = {
  hex: string;
  percent: number;
};

export type AccessibilitySummary = {
  ratio: number;
  strength: string;
  brightnessDifference: string;
  notes: string[];
};

export type HarmonySummary = {
  label: string;
  explanation: string;
  hueDifference: number;
};

export type StyleReadSummary = {
  label: string;
  explanation: string;
};

export type ScoreBreakdownItem = {
  label: string;
  score: number;
  weight: number;
  explanation: string;
};

export type ColorMatchResult = {
  score: number;
  rating: string;
  reason: string;
  summary: string;
  harmony: HarmonySummary;
  styleRead: StyleReadSummary;
  scoreBreakdown: ScoreBreakdownItem[];
  paletteA: PaletteEntry[];
  paletteB: PaletteEntry[];
  contrastNotes: AccessibilitySummary;
  suggestions: string[];
  avoid: string[];
};

export type ColorMatchRequest =
  | {
      mode: "colors";
      colorA: string;
      colorB: string;
    }
  | {
      mode: "images";
      imageA: string;
      imageB: string;
    };

type WeightedPaletteEntry = PaletteEntry & {
  rgb: Rgb;
  hsl: Hsl;
};

type PairBreakdown = {
  hue: number;
  lightness: number;
  saturation: number;
  neutral: number;
  accessibility: number;
  total: number;
};

type AggregateBreakdown = PairBreakdown & {
  topPair: PairBreakdown;
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_DIMENSION = 72;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function normalizeHex(input: string) {
  const value = input.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(value);
  if (short) {
    const chars = short[1].split("");
    return `#${chars.map((char) => char + char).join("").toUpperCase()}`;
  }

  const full = /^#([0-9a-f]{6})$/i.exec(value);
  if (!full) {
    throw new Error("Invalid hex color.");
  }

  return `#${full[1].toUpperCase()}`;
}

export function hexToRgb(input: string): Rgb {
  const hex = normalizeHex(input).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / delta) % 6);
        break;
      case gn:
        h = 60 * ((bn - rn) / delta + 2);
        break;
      default:
        h = 60 * ((rn - gn) / delta + 4);
        break;
    }
  }

  return {
    h: (h + 360) % 360,
    s,
    l,
  };
}

export function relativeLuminance({ r, g, b }: Rgb) {
  const transform = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  const rs = transform(r);
  const gs = transform(g);
  const bs = transform(b);

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(colorA: Rgb, colorB: Rgb) {
  const a = relativeLuminance(colorA);
  const b = relativeLuminance(colorB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function hueDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function colorDistance(colorA: Rgb, colorB: Rgb) {
  const hslA = rgbToHsl(colorA);
  const hslB = rgbToHsl(colorB);
  const hue = hueDistance(hslA.h, hslB.h) / 180;
  const sat = Math.abs(hslA.s - hslB.s);
  const light = Math.abs(hslA.l - hslB.l);
  return clamp(Math.sqrt(hue * hue * 0.5 + sat * sat * 0.25 + light * light * 0.25), 0, 1);
}

function scoreNear(value: number, target: number, range: number) {
  const distance = Math.abs(value - target);
  if (distance >= range) return 0;
  return 100 * (1 - distance / range);
}

function isNeutral(hsl: Hsl) {
  return hsl.s < 0.12 || (hsl.l < 0.14 || hsl.l > 0.9);
}

function isBeige(hsl: Hsl) {
  return hsl.h >= 28 && hsl.h <= 60 && hsl.s <= 0.35 && hsl.l >= 0.68;
}

function isBrown(hsl: Hsl) {
  return hsl.h >= 15 && hsl.h <= 42 && hsl.s >= 0.2 && hsl.l <= 0.45;
}

function isNavy(hsl: Hsl) {
  return hsl.h >= 205 && hsl.h <= 245 && hsl.s <= 0.45 && hsl.l <= 0.28;
}

function isDenimLike(hsl: Hsl) {
  return hsl.h >= 200 && hsl.h <= 230 && hsl.s >= 0.18 && hsl.s <= 0.55 && hsl.l >= 0.28 && hsl.l <= 0.56;
}

function colorFamily(hsl: Hsl) {
  if (hsl.l <= 0.08) return "black";
  if (hsl.l >= 0.94 && hsl.s <= 0.08) return "white";
  if (hsl.s <= 0.12) return "gray";
  if (isBeige(hsl)) return "beige";
  if (isBrown(hsl)) return "brown";
  if (isNavy(hsl)) return "navy";
  if (isDenimLike(hsl)) return "denim";
  return "color";
}

function averageHue(hues: number[]) {
  const x = hues.reduce((sum, hue) => sum + Math.cos((hue * Math.PI) / 180), 0);
  const y = hues.reduce((sum, hue) => sum + Math.sin((hue * Math.PI) / 180), 0);
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function describeTemperature(hsl: Hsl) {
  if (colorFamily(hsl) === "navy" || colorFamily(hsl) === "denim") return "cool";
  if (colorFamily(hsl) === "beige" || colorFamily(hsl) === "brown") return "warm";
  if (isNeutral(hsl)) return "neutral";
  if (hsl.h < 65 || hsl.h >= 320) return "warm";
  if (hsl.h >= 150 && hsl.h <= 285) return "cool";
  return "mixed";
}

export function hueHarmonyScore(colorA: Hsl, colorB: Hsl) {
  if (isNeutral(colorA) && isNeutral(colorB)) return 88;
  if (isNeutral(colorA) || isNeutral(colorB)) return 82;

  const diff = hueDistance(colorA.h, colorB.h);
  const complementary = scoreNear(diff, 180, 55);
  const analogous = scoreNear(diff, 28, 32);
  const triadic = scoreNear(diff, 120, 34) * 0.9;
  const sameFamily = scoreNear(diff, 0, 20) * 0.65;

  return clamp(Math.max(complementary, analogous, triadic, sameFamily, 18), 0, 100);
}

export function saturationBalanceScore(colorA: Hsl, colorB: Hsl) {
  if (isNeutral(colorA) && isNeutral(colorB)) return 92;
  if (isNeutral(colorA) || isNeutral(colorB)) return 84;

  const diff = Math.abs(colorA.s - colorB.s);
  const avg = (colorA.s + colorB.s) / 2;
  let score = 92 - diff * 70;

  if (avg > 0.72 && diff > 0.28) {
    score -= 12;
  }

  return clamp(score, 18, 100);
}

export function lightnessContrastScore(colorA: Hsl, colorB: Hsl) {
  const diff = Math.abs(colorA.l - colorB.l);

  if (isNeutral(colorA) && isNeutral(colorB)) {
    return clamp(58 + diff * 85, 26, 100);
  }

  if (diff < 0.08) return 38;
  if (diff < 0.16) return 58;
  if (diff <= 0.48) return clamp(82 + (0.48 - Math.abs(diff - 0.3)) * 18, 70, 100);
  if (diff <= 0.7) return 78;
  return 62;
}

export function neutralCompatibilityScore(colorA: Hsl, colorB: Hsl) {
  const familyA = colorFamily(colorA);
  const familyB = colorFamily(colorB);

  if (familyA === familyB && familyA !== "color") return 92;
  if (familyA === "gray" || familyB === "gray") return 88;
  if (familyA === "black" || familyA === "white" || familyB === "black" || familyB === "white") return 90;
  if (familyA === "beige" || familyB === "beige") return 86;
  if ((familyA === "navy" || familyA === "denim") && familyB !== "color") return 90;
  if ((familyB === "navy" || familyB === "denim") && familyA !== "color") return 90;
  if (familyA === "brown" || familyB === "brown") return 78;
  if (familyA !== "color" || familyB !== "color") return 80;

  return 62;
}

export function accessibilityScore(colorA: Rgb, colorB: Rgb) {
  const ratio = contrastRatio(colorA, colorB);
  const lumDiff = Math.abs(relativeLuminance(colorA) - relativeLuminance(colorB));

  let score = clamp((ratio / 7) * 65 + lumDiff * 35, 0, 100);
  if (ratio < 2.2) score -= 10;
  return clamp(score, 0, 100);
}

export function getRating(score: number) {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Okay match";
  if (score >= 30) return "Risky match";
  return "Low match";
}

function buildPaletteEntry(hex: string, percent: number): WeightedPaletteEntry {
  const rgb = hexToRgb(hex);
  return {
    hex,
    percent,
    rgb,
    hsl: rgbToHsl(rgb),
  };
}

function normalizePalette(entries: WeightedPaletteEntry[]) {
  const total = entries.reduce((sum, entry) => sum + entry.percent, 0) || 1;
  return entries.map((entry) => ({
    ...entry,
    percent: round((entry.percent / total) * 100, 1),
  }));
}

function mergeSimilarEntries(entries: WeightedPaletteEntry[]) {
  const merged: WeightedPaletteEntry[] = [];

  for (const entry of entries) {
    const existing = merged.find((candidate) => colorDistance(candidate.rgb, entry.rgb) < 0.12);

    if (!existing) {
      merged.push({ ...entry });
      continue;
    }

    const combined = existing.percent + entry.percent;
    existing.rgb = {
      r: (existing.rgb.r * existing.percent + entry.rgb.r * entry.percent) / combined,
      g: (existing.rgb.g * existing.percent + entry.rgb.g * entry.percent) / combined,
      b: (existing.rgb.b * existing.percent + entry.rgb.b * entry.percent) / combined,
    };
    existing.hex = rgbToHex(existing.rgb);
    existing.hsl = rgbToHsl(existing.rgb);
    existing.percent = combined;
  }

  return merged;
}

function reduceExtremeDominance(weight: number, hsl: Hsl) {
  if (hsl.l >= 0.95 && hsl.s <= 0.08) return weight * 0.14;
  if (hsl.l >= 0.88 && hsl.s <= 0.1) return weight * 0.3;
  if (hsl.l <= 0.07) return weight * 0.18;
  if (hsl.l <= 0.12 && hsl.s <= 0.16) return weight * 0.26;
  return weight;
}

function dataUrlToBuffer(dataUrl: string) {
  const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\n\r]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Image payload must be a base64 data URL.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image payload is too large.");
  }

  return buffer;
}

async function extractPaletteFromImageDataUrl(dataUrl: string) {
  const inputBuffer = dataUrlToBuffer(dataUrl);
  let data: Buffer;
  let info: sharp.OutputInfo;

  try {
    const output = await sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    data = output.data;
    info = output.info;
  } catch {
    throw new Error(
      "Could not read one of the uploaded images. Try a JPG or PNG image, or use a smaller file.",
    );
  }

  const buckets = new Map<
    string,
    { weight: number; r: number; g: number; b: number }
  >();

  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const alpha = info.channels >= 4 ? data[index + 3] ?? 255 : 255;

    if (alpha < 32) continue;

    const rgb = { r, g, b };
    const hsl = rgbToHsl(rgb);
    const hueBin = isNeutral(hsl) ? "n" : Math.round(hsl.h / 18) * 18;
    const satBin = Math.round(hsl.s * 5);
    const lightBin = Math.round(hsl.l * 5);

    const key = `${hueBin}:${satBin}:${lightBin}`;
    const weight = reduceExtremeDominance(alpha / 255, hsl);
    if (weight <= 0.02) continue;

    const current = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
    current.weight += weight;
    current.r += r * weight;
    current.g += g * weight;
    current.b += b * weight;
    buckets.set(key, current);
  }

  const merged = mergeSimilarEntries(
    [...buckets.values()]
      .map((bucket) => {
        const rgb = {
          r: bucket.r / bucket.weight,
          g: bucket.g / bucket.weight,
          b: bucket.b / bucket.weight,
        };
        return {
          hex: rgbToHex(rgb),
          percent: bucket.weight,
          rgb,
          hsl: rgbToHsl(rgb),
        };
      })
      .sort((a, b) => b.percent - a.percent),
  );

  const palette = normalizePalette(merged)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  if (palette.length === 0) {
    throw new Error(
      "Could not find enough usable colors in one of the images. Try a clearer photo with the clothing filling more of the frame.",
    );
  }

  return palette;
}

function describeAccessibility(primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry): AccessibilitySummary {
  const ratio = contrastRatio(primaryA.rgb, primaryB.rgb);
  const lumDiff = Math.abs(relativeLuminance(primaryA.rgb) - relativeLuminance(primaryB.rgb));
  const satDiff = Math.abs(primaryA.hsl.s - primaryB.hsl.s);
  const lightDiff = Math.abs(primaryA.hsl.l - primaryB.hsl.l);
  const notes: string[] = [];

  let contrastStrength = "Low";
  if (ratio >= 7) contrastStrength = "Excellent";
  else if (ratio >= 4.5) contrastStrength = "Strong";
  else if (ratio >= 3) contrastStrength = "Moderate";

  let brightnessDifference = "Similar";
  if (lumDiff >= 0.42) brightnessDifference = "Very clear";
  else if (lumDiff >= 0.24) brightnessDifference = "Clear";
  else if (lumDiff >= 0.12) brightnessDifference = "Moderate";

  if (ratio < 3) {
    notes.push("Low contrast may make the combination harder to distinguish at a glance.");
  } else if (ratio >= 4.5) {
    notes.push("Good contrast should make the pieces easier to tell apart.");
  }

  if (lumDiff < 0.12) {
    notes.push("The colors have similar brightness, so shape or texture may matter more than color alone.");
  } else if (lumDiff >= 0.24) {
    notes.push("Brightness difference is helping the outfit read more clearly.");
  }

  const redGreenRisk =
    ((primaryA.hsl.h <= 25 || primaryA.hsl.h >= 335) && primaryB.hsl.h >= 85 && primaryB.hsl.h <= 160) ||
    ((primaryB.hsl.h <= 25 || primaryB.hsl.h >= 335) && primaryA.hsl.h >= 85 && primaryA.hsl.h <= 160);
  if (redGreenRisk && lightDiff < 0.2 && satDiff < 0.35) {
    notes.push("Red and green separation may be less obvious for some viewers if brightness stays close.");
  }

  const bluePurpleRisk =
    ((primaryA.hsl.h >= 210 && primaryA.hsl.h <= 250) && (primaryB.hsl.h >= 251 && primaryB.hsl.h <= 300)) ||
    ((primaryB.hsl.h >= 210 && primaryB.hsl.h <= 250) && (primaryA.hsl.h >= 251 && primaryA.hsl.h <= 300));
  if (bluePurpleRisk && lightDiff < 0.18) {
    notes.push("Blue and purple may read closer together when lighting is dim or fabric is glossy.");
  }

  if (notes.length === 0) {
    notes.push("No major contrast concern stands out from the dominant colors.");
  }

  return {
    ratio: round(ratio, 1),
    strength: contrastStrength,
    brightnessDifference,
    notes,
  };
}

function comparePair(entryA: WeightedPaletteEntry, entryB: WeightedPaletteEntry): PairBreakdown {
  const hue = hueHarmonyScore(entryA.hsl, entryB.hsl);
  const lightness = lightnessContrastScore(entryA.hsl, entryB.hsl);
  const saturation = saturationBalanceScore(entryA.hsl, entryB.hsl);
  const neutral = neutralCompatibilityScore(entryA.hsl, entryB.hsl);
  const accessibility = accessibilityScore(entryA.rgb, entryB.rgb);

  let total =
    hue * 0.35 +
    lightness * 0.25 +
    saturation * 0.2 +
    neutral * 0.1 +
    accessibility * 0.1;

  const bothBold = entryA.hsl.s > 0.72 && entryB.hsl.s > 0.72;
  if (bothBold && hue < 60) {
    total -= 10;
  }

  return {
    hue,
    lightness,
    saturation,
    neutral,
    accessibility,
    total: clamp(total, 0, 100),
  };
}

function explainHueScore(score: number, hueDifference: number, neutralA: boolean, neutralB: boolean) {
  if (neutralA || neutralB) {
    return "A calmer color is helping the pairing feel easier and more flexible.";
  }
  if (hueDifference < 15) {
    return "The colors are very close, which tends to feel smooth and intentional.";
  }
  if (hueDifference >= 15 && hueDifference <= 45) {
    return "These colors sit close to each other, which often feels coordinated.";
  }
  if (Math.abs(hueDifference - 120) <= 26) {
    return "These colors are far enough apart to feel lively, but they still make sense together.";
  }
  if (Math.abs(hueDifference - 180) <= 34) {
    return "These colors push against each other in a useful way, which gives the outfit more energy.";
  }
  if (score < 45) {
    return "The color relationship is less natural here, so styling choices matter more.";
  }
  return "The colors are different enough to create interest without feeling completely disconnected.";
}

function explainLightnessScore(score: number, diff: number) {
  if (diff < 0.08) {
    return "The brightness is very close, so the pieces may blend together unless texture or shape separates them.";
  }
  if (diff < 0.16) {
    return "There is some separation in brightness, but not a dramatic one.";
  }
  if (score >= 75) {
    return "The brightness difference helps each piece stand apart.";
  }
  return "The lightness contrast is usable, but it may need support from fabric, cut, or accessories.";
}

function explainSaturationScore(score: number, satA: number, satB: number) {
  const avg = (satA + satB) / 2;
  const diff = Math.abs(satA - satB);
  if (avg > 0.72 && diff < 0.18) {
    return "Both colors are vivid, so the pairing can feel louder and more playful.";
  }
  if (avg < 0.22) {
    return "Since both colors are muted, the combination may feel softer and more understated.";
  }
  if (diff > 0.3) {
    return "One color is stronger, but the pairing still feels controlled.";
  }
  if (score >= 75) {
    return "The intensity feels balanced, so neither side overwhelms the other.";
  }
  return "The saturation balance is workable, but the outfit may lean more stylized than effortless.";
}

function explainNeutralScore(score: number, familyA: string, familyB: string) {
  if (familyA !== "color" || familyB !== "color") {
    return "One side is acting like an easy base, which helps the whole outfit feel steadier.";
  }
  if (score >= 75) {
    return "Even without a true neutral, the colors still give each other some room.";
  }
  return "Neither color is fully neutral, so styling choices matter more.";
}

function explainContrastScore(score: number, accessibility: AccessibilitySummary) {
  if (accessibility.ratio >= 4.5) {
    return "The visual separation is noticeable and readable.";
  }
  if (accessibility.ratio < 3) {
    return "The contrast is softer, so the pieces may read as a quieter blend.";
  }
  if (score >= 70) {
    return "There is enough contrast for the outfit to feel clearly split into pieces.";
  }
  return "The contrast works, but it is not doing a lot of the styling work on its own.";
}

function buildHarmony(primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry): HarmonySummary {
  const hueDifference = Math.round(hueDistance(primaryA.hsl.h, primaryB.hsl.h));
  const neutralA = isNeutral(primaryA.hsl);
  const neutralB = isNeutral(primaryB.hsl);
  const familyA = colorFamily(primaryA.hsl);
  const familyB = colorFamily(primaryB.hsl);
  const avgHue = averageHue([primaryA.hsl.h, primaryB.hsl.h]);
  const temperature = describeTemperature({ ...primaryA.hsl, h: avgHue });

  if (neutralA && neutralB) {
    return {
      label: "Soft and easy together",
      explanation: "Both sides act like quiet basics, so the look depends more on depth and texture than on strong color contrast.",
      hueDifference,
    };
  }

  if (neutralA || neutralB) {
    return {
      label:
        familyA === "navy" || familyB === "navy" || familyA === "denim" || familyB === "denim"
          ? "Easy base with a stronger accent"
          : "One color keeps the other grounded",
      explanation: "One side acts like an anchor, which makes the stronger color easier to wear and easier to style around.",
      hueDifference,
    };
  }

  if (hueDifference < 15) {
    return {
      label: temperature === "warm" ? "Very close and warm" : temperature === "cool" ? "Very close and cool" : "Very close in color",
      explanation: "The colors are very close, so the match feels smooth and deliberate rather than high-contrast.",
      hueDifference,
    };
  }

  if (hueDifference >= 15 && hueDifference <= 45) {
    return {
      label:
        temperature === "warm" || familyA === "brown" || familyB === "brown" || familyA === "beige" || familyB === "beige"
          ? "Warm and naturally coordinated"
          : temperature === "cool"
            ? "Cool and naturally coordinated"
            : "Close and coordinated",
      explanation: "The colors are close enough to feel coordinated, while the difference in depth adds separation.",
      hueDifference,
    };
  }

  if (Math.abs(hueDifference - 120) <= 26) {
    return {
      label: "Playful but still balanced",
      explanation: "The colors are spaced widely enough to feel energetic, but they still make visual sense together.",
      hueDifference,
    };
  }

  if (Math.abs(hueDifference - 180) <= 34) {
    return {
      label: "Opposite colors with strong contrast",
      explanation: "The colors push against each other strongly enough to create definition and a more noticeable statement.",
      hueDifference,
    };
  }

  return {
    label: "Different, but possibly workable",
    explanation: "The colors come from different families, so the match depends more on depth, intensity, and styling balance.",
    hueDifference,
  };
}

function buildStyleRead(primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry, harmony: HarmonySummary): StyleReadSummary {
  const avgSaturation = (primaryA.hsl.s + primaryB.hsl.s) / 2;
  const saturationDiff = Math.abs(primaryA.hsl.s - primaryB.hsl.s);
  const lightnessDiff = Math.abs(primaryA.hsl.l - primaryB.hsl.l);
  const temperatureA = describeTemperature(primaryA.hsl);
  const temperatureB = describeTemperature(primaryB.hsl);

  let label = "Balanced and coordinated";
  let explanation = "This pairing tends to feel put together because the colors are separated enough to read clearly without fighting each other.";

  if (avgSaturation > 0.72) {
    label = "Bold, lively, and noticeable";
    explanation = "Because both colors are fairly vivid, the outfit may feel louder and more playful than quiet or subtle.";
  } else if (avgSaturation < 0.22) {
    label = "Soft, understated, and calm";
    explanation = "Since both colors are muted, the combination may feel softer and less dramatic.";
  } else if (lightnessDiff >= 0.24) {
    label = "Clear, layered, and easy to read";
    explanation = "The difference in depth helps the top and bottom stand apart, which usually makes the outfit feel more intentional.";
  } else if (harmony.label.includes("Opposite colors")) {
    label = "Bold, contrasted, coordinated";
    explanation = "The colors create more visual tension, which can feel confident when the rest of the outfit stays simple.";
  } else if ((temperatureA === "warm" && temperatureB === "warm") || harmony.label.includes("earthy")) {
    label = "Warm, grounded, coordinated";
    explanation = "This combination tends to feel earthy, approachable, and slightly bold because one color is deeper and stronger.";
  } else if ((temperatureA === "cool" && temperatureB === "cool")) {
    label = "Cool, polished, coordinated";
    explanation = "The pairing tends to feel cleaner and more composed because both colors lean into a cooler family.";
  }

  if (saturationDiff > 0.32 && avgSaturation > 0.28) {
    explanation += " One color is carrying more of the visual weight, which can be useful if you want one piece to lead.";
  }

  return { label, explanation };
}

function buildSummary(primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry, harmony: HarmonySummary) {
  const lightnessDiff = Math.abs(primaryA.hsl.l - primaryB.hsl.l);
  const darkerSide = primaryA.hsl.l < primaryB.hsl.l ? "top color" : "bottom color";
  const lighterSide = darkerSide === "top color" ? "bottom color" : "top color";

  let firstSentence = "These two colors can work because they have enough relationship to feel intentional.";
  if (harmony.label.includes("Opposite colors")) {
    firstSentence = "These two colors work because the contrast between them creates a clear, deliberate pairing.";
  } else if (harmony.label.includes("Warm and naturally coordinated") || harmony.label.includes("Cool and naturally coordinated") || harmony.label.includes("Very close")) {
    firstSentence = "These two colors work because they sit in a related family and feel naturally coordinated.";
  } else if (harmony.label.includes("Easy base") || harmony.label.includes("grounded") || harmony.label.includes("Soft and easy")) {
    firstSentence = "These two colors work because one side acts like a stabilizer, which makes the pairing easier to wear.";
  }

  let secondSentence = "The separation between them helps the outfit avoid feeling flat.";
  if (lightnessDiff >= 0.22) {
    secondSentence = `The darker ${darkerSide} adds depth, while the lighter ${lighterSide} keeps the pairing from feeling too heavy.`;
  } else if (lightnessDiff < 0.1) {
    secondSentence = "Because their brightness is fairly close, texture and fit may matter more than contrast alone.";
  }

  return `${firstSentence} ${secondSentence}`;
}

function buildSuggestions(primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry, harmony: HarmonySummary, accessibility: AccessibilitySummary) {
  const suggestions: string[] = [];
  const familyA = colorFamily(primaryA.hsl);
  const familyB = colorFamily(primaryB.hsl);
  const bothVivid = primaryA.hsl.s > 0.72 && primaryB.hsl.s > 0.72;
  const bothMuted = primaryA.hsl.s < 0.24 && primaryB.hsl.s < 0.24;
  const lowLightnessDiff = Math.abs(primaryA.hsl.l - primaryB.hsl.l) < 0.12;
  const hasNeutral = familyA !== "color" || familyB !== "color";

  if (!hasNeutral) {
    suggestions.push("A neutral third piece can help balance the pairing.");
  }

  if (harmony.label.includes("Warm and naturally coordinated")) {
    suggestions.push("Cream, tan, denim, navy, or soft brown can support this pairing well.");
  } else if (harmony.label.includes("Opposite colors")) {
    suggestions.push("Keeping the shoe, bag, or jacket simpler can help the contrast feel intentional instead of busy.");
  } else if (harmony.label.includes("Easy base") || harmony.label.includes("grounded") || harmony.label.includes("Soft and easy")) {
    suggestions.push("You can let one accent piece do the talking since the base pairing is already easy to style.");
  }

  if (bothVivid) {
    suggestions.push("A simple way to balance this is to keep accessories quieter than the main colors.");
  } else if (bothMuted) {
    suggestions.push("Texture, metal accents, or a sharper shoe choice can keep the softer palette from feeling sleepy.");
  }

  if (lowLightnessDiff || accessibility.ratio < 3) {
    suggestions.push("A belt, jacket, or layer with stronger depth can help the top and bottom read more clearly.");
  }

  return [...new Set(suggestions)].slice(0, 4);
}

function buildAvoid(primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry, harmony: HarmonySummary, accessibility: AccessibilitySummary) {
  const avoid: string[] = [];
  const bothVivid = primaryA.hsl.s > 0.72 && primaryB.hsl.s > 0.72;
  const lowLightnessDiff = Math.abs(primaryA.hsl.l - primaryB.hsl.l) < 0.12;
  const warmBoth = describeTemperature(primaryA.hsl) === "warm" && describeTemperature(primaryB.hsl) === "warm";

  if (bothVivid) {
    avoid.push("Too many additional bright accent colors may make the outfit feel crowded.");
  }

  if (warmBoth && harmony.label.includes("earthy")) {
    avoid.push("Too many additional orange or red pieces may make the outfit feel heavy.");
  }

  if (lowLightnessDiff) {
    avoid.push("If the fabrics are also similar, the outfit may lose separation and read as one block.");
  }

  if (accessibility.ratio < 3) {
    avoid.push("Very low-contrast layers on top of this pairing may make the overall look harder to read.");
  }

  return [...new Set(avoid)].slice(0, 3);
}

function buildReason(score: number, primaryA: WeightedPaletteEntry, primaryB: WeightedPaletteEntry, topPair: PairBreakdown) {
  const familyA = colorFamily(primaryA.hsl);
  const familyB = colorFamily(primaryB.hsl);
  const hueDiff = hueDistance(primaryA.hsl.h, primaryB.hsl.h);

  if (score >= 85) {
    return "These colors balance well through strong harmony, useful contrast, and an easy visual separation.";
  }
  if (score >= 70) {
    if (familyA !== "color" || familyB !== "color") {
      return "One side behaves like a flexible neutral, which helps the combination feel stable and easy to wear.";
    }
    if (Math.abs(hueDiff - 180) < 28) {
      return "The dominant colors lean toward a complementary pairing, which usually creates a confident outfit match.";
    }
    return "The palette has a solid relationship, with enough contrast and balance to feel coordinated.";
  }
  if (score >= 50) {
    return "The pairing can work, but it depends more on fabric texture, styling, and lighting than on color harmony alone.";
  }
  if (score >= 30) {
    if (topPair.saturation < 55) {
      return "The colors sit close in intensity and may blur together unless cut, texture, or accessories separate them.";
    }
    return "The combination feels less settled because the dominant colors compete more than they support each other.";
  }
  return "The dominant colors appear to clash or flatten each other, so this pairing may be harder to make feel intentional.";
}

function toPublicPalette(entries: WeightedPaletteEntry[]): PaletteEntry[] {
  return entries.map(({ hex, percent }) => ({ hex, percent: round(percent, 1) }));
}

function buildScoreBreakdown(
  aggregate: PairBreakdown,
  primaryA: WeightedPaletteEntry,
  primaryB: WeightedPaletteEntry,
  contrastNotes: AccessibilitySummary,
): ScoreBreakdownItem[] {
  const hueDifference = hueDistance(primaryA.hsl.h, primaryB.hsl.h);
  const neutralA = isNeutral(primaryA.hsl);
  const neutralB = isNeutral(primaryB.hsl);
  const familyA = colorFamily(primaryA.hsl);
  const familyB = colorFamily(primaryB.hsl);

  return [
    {
      label: "Easy to wear together",
      score: Math.round(aggregate.hue),
      weight: 35,
      explanation: explainHueScore(aggregate.hue, hueDifference, neutralA, neutralB),
    },
    {
      label: "Light + dark mix",
      score: Math.round(aggregate.lightness),
      weight: 25,
      explanation: explainLightnessScore(aggregate.lightness, Math.abs(primaryA.hsl.l - primaryB.hsl.l)),
    },
    {
      label: "How strong the colors feel",
      score: Math.round(aggregate.saturation),
      weight: 20,
      explanation: explainSaturationScore(aggregate.saturation, primaryA.hsl.s, primaryB.hsl.s),
    },
    {
      label: "Easy base support",
      score: Math.round(aggregate.neutral),
      weight: 10,
      explanation: explainNeutralScore(aggregate.neutral, familyA, familyB),
    },
    {
      label: "Do they stand apart?",
      score: Math.round(aggregate.accessibility),
      weight: 10,
      explanation: explainContrastScore(aggregate.accessibility, contrastNotes),
    },
  ];
}

function scorePalettes(paletteA: WeightedPaletteEntry[], paletteB: WeightedPaletteEntry[]): ColorMatchResult {
  let weightedScore = 0;
  let weightTotal = 0;
  let strongestPair: PairBreakdown | null = null;
  let weightedHue = 0;
  let weightedLightness = 0;
  let weightedSaturation = 0;
  let weightedNeutral = 0;
  let weightedAccessibility = 0;

  for (const entryA of paletteA) {
    for (const entryB of paletteB) {
      const pair = comparePair(entryA, entryB);
      const weight = (entryA.percent / 100) * (entryB.percent / 100);
      weightedScore += pair.total * weight;
      weightedHue += pair.hue * weight;
      weightedLightness += pair.lightness * weight;
      weightedSaturation += pair.saturation * weight;
      weightedNeutral += pair.neutral * weight;
      weightedAccessibility += pair.accessibility * weight;
      weightTotal += weight;

      if (!strongestPair || pair.total > strongestPair.total) {
        strongestPair = pair;
      }
    }
  }

  const primaryA = paletteA[0];
  const primaryB = paletteB[0];
  const score = clamp(Math.round(weightedScore / (weightTotal || 1)), 0, 100);
  const contrastNotes = describeAccessibility(primaryA, primaryB);
  const aggregate: AggregateBreakdown = {
    hue: weightedHue / (weightTotal || 1),
    lightness: weightedLightness / (weightTotal || 1),
    saturation: weightedSaturation / (weightTotal || 1),
    neutral: weightedNeutral / (weightTotal || 1),
    accessibility: weightedAccessibility / (weightTotal || 1),
    total: score,
    topPair: strongestPair ?? comparePair(primaryA, primaryB),
  };
  const harmony = buildHarmony(primaryA, primaryB);
  const styleRead = buildStyleRead(primaryA, primaryB, harmony);
  const summary = buildSummary(primaryA, primaryB, harmony);
  const scoreBreakdown = buildScoreBreakdown(aggregate, primaryA, primaryB, contrastNotes);
  const suggestions = buildSuggestions(primaryA, primaryB, harmony, contrastNotes);
  const avoid = buildAvoid(primaryA, primaryB, harmony, contrastNotes);

  return {
    score,
    rating: getRating(score),
    reason: buildReason(score, primaryA, primaryB, aggregate.topPair),
    summary,
    harmony,
    styleRead,
    scoreBreakdown,
    paletteA: toPublicPalette(paletteA),
    paletteB: toPublicPalette(paletteB),
    contrastNotes,
    suggestions,
    avoid,
  };
}

function validateColorsPayload(input: ColorMatchRequest) {
  if (input.mode !== "colors") {
    throw new Error("Unsupported mode.");
  }

  const colorA = normalizeHex(input.colorA);
  const colorB = normalizeHex(input.colorB);

  return {
    paletteA: [buildPaletteEntry(colorA, 100)],
    paletteB: [buildPaletteEntry(colorB, 100)],
  };
}

async function validateImagesPayload(input: ColorMatchRequest) {
  if (input.mode !== "images") {
    throw new Error("Unsupported mode.");
  }
  if (!input.imageA || !input.imageB) {
    throw new Error("Two image payloads are required.");
  }

  const [paletteA, paletteB] = await Promise.all([
    extractPaletteFromImageDataUrl(input.imageA),
    extractPaletteFromImageDataUrl(input.imageB),
  ]);

  return { paletteA, paletteB };
}

export async function analyzeColorMatch(input: ColorMatchRequest): Promise<ColorMatchResult> {
  const palettes =
    input.mode === "colors"
      ? validateColorsPayload(input)
      : await validateImagesPayload(input);

  return scorePalettes(palettes.paletteA, palettes.paletteB);
}
