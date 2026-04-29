"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

type Mode = "photo" | "colors";

type Result = {
  score: number;
  rating: string;
  reason: string;
  summary: string;
  styleRead: {
    label: string;
    explanation: string;
  };
  paletteA: Array<{ hex: string; percent: number }>;
  paletteB: Array<{ hex: string; percent: number }>;
  suggestions: string[];
  avoid: string[];
};

function isValidHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

function isHeicLikeFile(file: File) {
  const loweredType = file.type.toLowerCase();
  const loweredName = file.name.toLowerCase();
  return (
    loweredType.includes("heic") ||
    loweredType.includes("heif") ||
    loweredName.endsWith(".heic") ||
    loweredName.endsWith(".heif")
  );
}

function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load that image."));
    image.src = url;
  });
}

async function fileToUploadDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    let image: HTMLImageElement;
    try {
      image = await loadImageFromUrl(objectUrl);
    } catch (error) {
      if (isHeicLikeFile(file)) {
        throw new Error(
          "This browser could not decode that HEIC image. Try Safari, or export it as JPG or PNG first.",
        );
      }
      throw error;
    }

    const maxDimension = 1000;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not process that image.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getAppRating(score: number) {
  if (score >= 85) return "Great";
  if (score >= 65) return "Good";
  return "Tricky";
}

export default function ColorMatchAppClient() {
  const [mode, setMode] = useState<Mode>("photo");
  const [colorA, setColorA] = useState("#355C7D");
  const [colorB, setColorB] = useState("#D9A066");
  const [colorAText, setColorAText] = useState("#355C7D");
  const [colorBText, setColorBText] = useState("#D9A066");
  const [imageAFile, setImageAFile] = useState<File | null>(null);
  const [imageBFile, setImageBFile] = useState<File | null>(null);
  const [imageAUrl, setImageAUrl] = useState("");
  const [imageBUrl, setImageBUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [selectedPaletteA, setSelectedPaletteA] = useState<string | null>(null);
  const [selectedPaletteB, setSelectedPaletteB] = useState<string | null>(null);
  const [error, setError] = useState("");

  const colorAIsValid = isValidHexColor(colorAText);
  const colorBIsValid = isValidHexColor(colorBText);
  const activeTopColor =
    mode === "colors" ? colorA : selectedPaletteA ?? result?.paletteA[0]?.hex ?? "#7B8494";
  const activeBottomColor =
    mode === "colors" ? colorB : selectedPaletteB ?? result?.paletteB[0]?.hex ?? "#B18E6B";
  const appRating = result ? getAppRating(result.score) : null;

  const requestColorComparison = useCallback(async (
    nextColorA: string,
    nextColorB: string,
    paletteAOverride?: Result["paletteA"],
    paletteBOverride?: Result["paletteB"],
  ) => {
    const response = await fetch("/api/color-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "colors",
        colorA: nextColorA,
        colorB: nextColorB,
      }),
    });

    const data = (await response.json()) as Result & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Could not analyze this pairing.");
    }

    setResult({
      ...data,
      paletteA: paletteAOverride ?? data.paletteA,
      paletteB: paletteBOverride ?? data.paletteB,
    });
  }, []);

  const analyzeImagePair = useCallback(async (nextImageA = imageAUrl, nextImageB = imageBUrl) => {
    const response = await fetch("/api/color-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "images",
        imageA: nextImageA,
        imageB: nextImageB,
      }),
    });

    const data = (await response.json()) as Result & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Could not analyze this pairing.");
    }

    const nextPaletteA = data.paletteA[0]?.hex ?? null;
    const nextPaletteB = data.paletteB[0]?.hex ?? null;
    setSelectedPaletteA(nextPaletteA);
    setSelectedPaletteB(nextPaletteB);

    if (nextPaletteA && nextPaletteB) {
      await requestColorComparison(nextPaletteA, nextPaletteB, data.paletteA, data.paletteB);
    } else {
      setResult(data);
    }
  }, [imageAUrl, imageBUrl, requestColorComparison]);

  useEffect(() => {
    if (mode !== "colors" || !colorAIsValid || !colorBIsValid) {
      return;
    }

    let cancelled = false;

    async function autoCompareColors() {
      setError("");
      try {
        await requestColorComparison(colorA, colorB);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not analyze this pairing.",
          );
        }
      }
    }

    void autoCompareColors();

    return () => {
      cancelled = true;
    };
  }, [colorA, colorAIsValid, colorB, colorBIsValid, mode, requestColorComparison]);

  useEffect(() => {
    if (mode !== "photo" || !imageAUrl || !imageBUrl) {
      return;
    }

    let cancelled = false;

    async function autoAnalyze() {
      setError("");
      try {
        await analyzeImagePair(imageAUrl, imageBUrl);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not analyze this pairing.",
          );
        }
      }
    }

    void autoAnalyze();

    return () => {
      cancelled = true;
    };
  }, [analyzeImagePair, imageAUrl, imageBUrl, mode]);

  async function onPickImage(side: "A" | "B", file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    try {
      setError("");
      const dataUrl = await fileToUploadDataUrl(file);
      if (side === "A") {
        setImageAFile(file);
        setImageAUrl(dataUrl);
      } else {
        setImageBFile(file);
        setImageBUrl(dataUrl);
      }
      setResult(null);
      setSelectedPaletteA(null);
      setSelectedPaletteB(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not read that image.",
      );
    }
  }

  function onColorPickerChange(side: "A" | "B", value: string) {
    if (side === "A") {
      setColorA(value);
      setColorAText(value.toUpperCase());
      setResult(null);
      return;
    }

    setColorB(value);
    setColorBText(value.toUpperCase());
    setResult(null);
  }

  function onHexTextChange(side: "A" | "B", value: string) {
    const normalized = value.startsWith("#") ? value : `#${value}`;

    if (side === "A") {
      setColorAText(normalized.toUpperCase());
      if (isValidHexColor(normalized)) {
        setColorA(normalized.toUpperCase());
        setResult(null);
      }
      return;
    }

    setColorBText(normalized.toUpperCase());
    if (isValidHexColor(normalized)) {
      setColorB(normalized.toUpperCase());
      setResult(null);
    }
  }

  async function onPaletteSwatchSelect(side: "A" | "B", hex: string) {
    const nextA = side === "A" ? hex : selectedPaletteA;
    const nextB = side === "B" ? hex : selectedPaletteB;

    if (side === "A") {
      setSelectedPaletteA(hex);
    } else {
      setSelectedPaletteB(hex);
    }

    if (mode !== "photo" || !nextA || !nextB || !result) {
      return;
    }

    setError("");

    try {
      await requestColorComparison(nextA, nextB, result.paletteA, result.paletteB);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not analyze this pairing.",
      );
    }
  }

  return (
    <main className={styles.wrap}>
      <section className={styles.panel}>
        <div className={styles.appHeader}>
          <div>
            <h1 className={styles.title}>Fashion Color Match</h1>
          </div>
          <p className={styles.subtitle}>
            See whether two colors feel like a good match.
          </p>
        </div>

        <div className={styles.segmented} aria-label="Input mode">
          <button
            type="button"
            className={`${styles.segment} ${mode === "photo" ? styles.segmentActive : ""}`}
            onClick={() => setMode("photo")}
          >
            Use photos
          </button>
          <button
            type="button"
            className={`${styles.segment} ${mode === "colors" ? styles.segmentActive : ""}`}
            onClick={() => setMode("colors")}
          >
            Manual colors
          </button>
        </div>

        <div className={styles.phoneFrame}>
          {mode === "photo" ? (
            <div className={styles.stack}>
              <label className={styles.card}>
                <div className={styles.cardLabel}>First piece</div>
                <div className={styles.uploadBox}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className={styles.fileInput}
                    onChange={(event) => void onPickImage("A", event.target.files?.[0] ?? null)}
                  />
                </div>
                <div className={styles.cardHint}>
                  {imageAFile ? imageAFile.name : "Take or upload the first photo"}
                </div>
                <div className={styles.photoChoiceRow}>
                  {imageAUrl ? (
                    <div className={styles.imageCardSmall}>
                      <Image
                        src={imageAUrl}
                        alt="First color source"
                        className={styles.imagePreview}
                        width={360}
                        height={360}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className={styles.imageCardPlaceholder}>Image A</div>
                  )}
                  <div className={styles.swatchColumn}>
                    <div className={styles.swatchColumnLabel}>Pick the main color</div>
                    {result?.paletteA?.length ? (
                      <div className={styles.swatchColumnList}>
                        {result.paletteA.map((swatch) => (
                          <button
                            type="button"
                            key={`photo-a-${swatch.hex}`}
                            className={`${styles.swatchPill} ${
                              activeTopColor === swatch.hex ? styles.swatchPillActive : ""
                            }`}
                            onClick={() => void onPaletteSwatchSelect("A", swatch.hex)}
                          >
                            <span className={styles.swatchDot} style={{ backgroundColor: swatch.hex }} />
                            <span>{swatch.hex}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.swatchEmpty}>Suggested colors will appear here.</div>
                    )}
                  </div>
                </div>
              </label>

              <label className={styles.card}>
                <div className={styles.cardLabel}>Second piece</div>
                <div className={styles.uploadBox}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className={styles.fileInput}
                    onChange={(event) => void onPickImage("B", event.target.files?.[0] ?? null)}
                  />
                </div>
                <div className={styles.cardHint}>
                  {imageBFile ? imageBFile.name : "Take or upload the second photo"}
                </div>
                <div className={styles.photoChoiceRow}>
                  {imageBUrl ? (
                    <div className={styles.imageCardSmall}>
                      <Image
                        src={imageBUrl}
                        alt="Second color source"
                        className={styles.imagePreview}
                        width={360}
                        height={360}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className={styles.imageCardPlaceholder}>Image B</div>
                  )}
                  <div className={styles.swatchColumn}>
                    <div className={styles.swatchColumnLabel}>Pick the main color</div>
                    {result?.paletteB?.length ? (
                      <div className={styles.swatchColumnList}>
                        {result.paletteB.map((swatch) => (
                          <button
                            type="button"
                            key={`photo-b-${swatch.hex}`}
                            className={`${styles.swatchPill} ${
                              activeBottomColor === swatch.hex ? styles.swatchPillActive : ""
                            }`}
                            onClick={() => void onPaletteSwatchSelect("B", swatch.hex)}
                          >
                            <span className={styles.swatchDot} style={{ backgroundColor: swatch.hex }} />
                            <span>{swatch.hex}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.swatchEmpty}>Suggested colors will appear here.</div>
                    )}
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <div className={styles.stack}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Color one</div>
                <div className={styles.row}>
                  <input
                    type="color"
                    value={colorA}
                    onChange={(event) => onColorPickerChange("A", event.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={colorAText}
                    onChange={(event) => onHexTextChange("A", event.target.value)}
                    className={`${styles.hexInput} ${!colorAIsValid ? styles.hexInputInvalid : ""}`}
                    spellCheck={false}
                    autoCapitalize="characters"
                  />
                </div>
                <div className={styles.cardHint}>Paste a hex like #355C7D or use the picker.</div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardLabel}>Color two</div>
                <div className={styles.row}>
                  <input
                    type="color"
                    value={colorB}
                    onChange={(event) => onColorPickerChange("B", event.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={colorBText}
                    onChange={(event) => onHexTextChange("B", event.target.value)}
                    className={`${styles.hexInput} ${!colorBIsValid ? styles.hexInputInvalid : ""}`}
                    spellCheck={false}
                    autoCapitalize="characters"
                  />
                </div>
                <div className={styles.cardHint}>The score refreshes as soon as both values are valid.</div>
              </div>
            </div>
          )}

          {error ? <div className={styles.errorCard}>{error}</div> : null}
        </div>
      </section>

      {result ? (
        <section className={styles.panel}>
          <div className={styles.resultHeader}>
            <div>
              <div className={styles.scoreValue}>{result.score}%</div>
              <div className={styles.scoreCaption}>
                {appRating}
                <span className={styles.scoreCaptionDot}>•</span>
                {result.score}%
              </div>
            </div>
            <div className={styles.miniPreview}>
              <span style={{ backgroundColor: activeTopColor }} />
              <span style={{ backgroundColor: activeBottomColor }} />
            </div>
          </div>

          <div className={styles.resultBody}>
            <div className={styles.infoCard}>
              <div className={styles.infoTitle}>Why it works</div>
              <p>{result.summary}</p>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoTitle}>Overall feel</div>
              <div className={styles.infoLead}>{result.styleRead.label}</div>
              <p>{result.styleRead.explanation}</p>
            </div>

            {result.suggestions.length ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Helpful styling tip</div>
                <ul>
                  {result.suggestions.slice(0, 2).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.avoid.length ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Things to watch</div>
                <ul>
                  {result.avoid.slice(0, 2).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
