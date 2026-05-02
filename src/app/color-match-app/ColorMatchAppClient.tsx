"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

type Flow = "compare" | "matches";
type Mode = "photo" | "colors";

type PaletteEntry = {
  hex: string;
  percent: number;
};

type Result = {
  score: number;
  rating: string;
  reason: string;
  summary: string;
  scoreBreakdown: Array<{
    label: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
  styleRead: {
    label: string;
    explanation: string;
  };
  paletteA: PaletteEntry[];
  paletteB: PaletteEntry[];
  suggestions: string[];
  avoid: string[];
};

type SuggestedMatch = {
  hex: string;
  label: string;
  score: number;
  rating: string;
  reason: string;
};

type SuggestionsResult = {
  baseColor: string | null;
  dominantColors?: PaletteEntry[];
  matches: SuggestedMatch[];
  needsSelection: boolean;
  requestedLimit: number;
  minScore: number;
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

function getResultSummaryTitle(score: number) {
  if (score >= 85) return "Why this works";
  if (score >= 65) return "Quick summary";
  return "Why this feels tricky";
}

export default function ColorMatchAppClient() {
  const [flow, setFlow] = useState<Flow>("compare");
  const [mode, setMode] = useState<Mode>("colors");
  const [matchesMode, setMatchesMode] = useState<Mode>("colors");

  const [colorA, setColorA] = useState("#355C7D");
  const [colorB, setColorB] = useState("#D9A066");
  const [colorAText, setColorAText] = useState("#355C7D");
  const [colorBText, setColorBText] = useState("#D9A066");

  const [matchColor, setMatchColor] = useState("#355C7D");
  const [matchColorText, setMatchColorText] = useState("#355C7D");

  const [imageAFile, setImageAFile] = useState<File | null>(null);
  const [imageBFile, setImageBFile] = useState<File | null>(null);
  const [imageAUrl, setImageAUrl] = useState("");
  const [imageBUrl, setImageBUrl] = useState("");

  const [matchImageFile, setMatchImageFile] = useState<File | null>(null);
  const [matchImageUrl, setMatchImageUrl] = useState("");

  const [result, setResult] = useState<Result | null>(null);
  const [matchesResult, setMatchesResult] = useState<SuggestionsResult | null>(null);

  const [selectedPaletteA, setSelectedPaletteA] = useState<string | null>(null);
  const [selectedPaletteB, setSelectedPaletteB] = useState<string | null>(null);
  const [selectedMatchPalette, setSelectedMatchPalette] = useState<string | null>(null);

  const [error, setError] = useState("");

  const colorAIsValid = isValidHexColor(colorAText);
  const colorBIsValid = isValidHexColor(colorBText);
  const matchColorIsValid = isValidHexColor(matchColorText);

  const activeTopColor =
    mode === "colors" ? colorA : selectedPaletteA ?? result?.paletteA[0]?.hex ?? "#7B8494";
  const activeBottomColor =
    mode === "colors" ? colorB : selectedPaletteB ?? result?.paletteB[0]?.hex ?? "#B18E6B";
  const activeMatchBaseColor =
    matchesMode === "colors"
      ? matchColor
      : selectedMatchPalette ?? matchesResult?.baseColor ?? "#7B8494";

  const appRating = result ? getAppRating(result.score) : null;
  const summaryTitle = result ? getResultSummaryTitle(result.score) : "Quick summary";

  const topMatch = matchesResult?.matches[0] ?? null;
  const topMatchLabel = topMatch ? `${topMatch.score}% • ${topMatch.label}` : null;

  const requestColorComparison = useCallback(async (
    nextColorA: string,
    nextColorB: string,
    paletteAOverride?: PaletteEntry[],
    paletteBOverride?: PaletteEntry[],
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

  const analyzeImagePair = useCallback(
    async (nextImageA = imageAUrl, nextImageB = imageBUrl) => {
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
    },
    [imageAUrl, imageBUrl, requestColorComparison],
  );

  const requestTopMatches = useCallback(
    async (
      payload:
        | {
            mode: "color";
            color: string;
          }
        | {
            mode: "image";
            image: string;
            selectedColor?: string;
          },
    ) => {
      const response = await fetch("/api/color-match/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SuggestionsResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not load suggestions.");
      }

      setMatchesResult(data);
    },
    [],
  );

  useEffect(() => {
    if (flow !== "compare" || mode !== "colors" || !colorAIsValid || !colorBIsValid) {
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
  }, [colorA, colorAIsValid, colorB, colorBIsValid, flow, mode, requestColorComparison]);

  useEffect(() => {
    if (flow !== "compare" || mode !== "photo" || !imageAUrl || !imageBUrl) {
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
  }, [analyzeImagePair, flow, imageAUrl, imageBUrl, mode]);

  useEffect(() => {
    if (flow !== "matches" || matchesMode !== "colors" || !matchColorIsValid) {
      return;
    }

    let cancelled = false;

    async function autoLoadMatches() {
      setError("");
      try {
        await requestTopMatches({
          mode: "color",
          color: matchColor,
        });
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load suggestions.",
          );
        }
      }
    }

    void autoLoadMatches();

    return () => {
      cancelled = true;
    };
  }, [flow, matchColor, matchColorIsValid, matchesMode, requestTopMatches]);

  useEffect(() => {
    if (
      flow !== "matches" ||
      matchesMode !== "photo" ||
      !matchImageUrl ||
      !selectedMatchPalette
    ) {
      return;
    }

    let cancelled = false;

    async function autoLoadPhotoMatches() {
      setError("");
      try {
        await requestTopMatches({
          mode: "image",
          image: matchImageUrl,
          selectedColor: selectedMatchPalette ?? undefined,
        });
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load suggestions.",
          );
        }
      }
    }

    void autoLoadPhotoMatches();

    return () => {
      cancelled = true;
    };
  }, [flow, matchImageUrl, matchesMode, requestTopMatches, selectedMatchPalette]);

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

  async function onPickMatchImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    try {
      setError("");
      const dataUrl = await fileToUploadDataUrl(file);
      setMatchImageFile(file);
      setMatchImageUrl(dataUrl);
      setMatchesResult(null);
      setSelectedMatchPalette(null);

      await requestTopMatches({
        mode: "image",
        image: dataUrl,
      });
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

  function onMatchColorChange(value: string) {
    setMatchColor(value);
    setMatchColorText(value.toUpperCase());
    setMatchesResult(null);
  }

  function onMatchHexTextChange(value: string) {
    const normalized = value.startsWith("#") ? value : `#${value}`;
    setMatchColorText(normalized.toUpperCase());
    if (isValidHexColor(normalized)) {
      setMatchColor(normalized.toUpperCase());
      setMatchesResult(null);
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

  function onMatchPaletteSelect(hex: string) {
    setSelectedMatchPalette(hex);
    setMatchesResult((current) =>
      current
        ? {
            ...current,
            baseColor: hex,
            matches: [],
            needsSelection: false,
          }
        : current,
    );
  }

  function onCompareSuggestedMatch(hex: string) {
    setFlow("compare");
    setMode("colors");
    setError("");
    setColorA(activeMatchBaseColor);
    setColorAText(activeMatchBaseColor.toUpperCase());
    setColorB(hex);
    setColorBText(hex.toUpperCase());
    setResult(null);
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

        <div className={styles.segmented} aria-label="Main mode">
          <button
            type="button"
            className={`${styles.segment} ${flow === "compare" ? styles.segmentActive : ""}`}
            onClick={() => {
              setFlow("compare");
              setError("");
            }}
          >
            Compare colors
          </button>
          <button
            type="button"
            className={`${styles.segment} ${flow === "matches" ? styles.segmentActive : ""}`}
            onClick={() => {
              setFlow("matches");
              setError("");
            }}
          >
            Top matches
          </button>
        </div>

        <div className={styles.phoneFrame}>
          {flow === "compare" ? (
            <>
              <div className={styles.subModeBlock}>
                <div className={styles.subModeLabel}>Input</div>
                <div className={styles.subModeRow} aria-label="Compare input mode">
                  <button
                    type="button"
                    className={`${styles.subModeChip} ${mode === "colors" ? styles.subModeChipActive : ""}`}
                    onClick={() => setMode("colors")}
                  >
                    Pick colors
                  </button>
                  <button
                    type="button"
                    className={`${styles.subModeChip} ${mode === "photo" ? styles.subModeChipActive : ""}`}
                    onClick={() => setMode("photo")}
                  >
                    Use photos
                  </button>
                </div>
              </div>

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
            </>
          ) : (
            <>
              <div className={styles.subModeBlock}>
                <div className={styles.subModeLabel}>Input</div>
                <div className={styles.subModeRow} aria-label="Top matches input mode">
                  <button
                    type="button"
                    className={`${styles.subModeChip} ${matchesMode === "colors" ? styles.subModeChipActive : ""}`}
                    onClick={() => setMatchesMode("colors")}
                  >
                    Pick a color
                  </button>
                  <button
                    type="button"
                    className={`${styles.subModeChip} ${matchesMode === "photo" ? styles.subModeChipActive : ""}`}
                    onClick={() => setMatchesMode("photo")}
                  >
                    Use photo
                  </button>
                </div>
              </div>

              {matchesMode === "photo" ? (
                <label className={styles.card}>
                  <div className={styles.cardLabel}>Base color photo</div>
                  <div className={styles.uploadBox}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className={styles.fileInput}
                      onChange={(event) => void onPickMatchImage(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className={styles.cardHint}>
                    {matchImageFile ? matchImageFile.name : "Take or upload one photo, then pick the main color"}
                  </div>
                  <div className={styles.photoChoiceRow}>
                    {matchImageUrl ? (
                      <div className={styles.imageCardSmall}>
                        <Image
                          src={matchImageUrl}
                          alt="Base color source"
                          className={styles.imagePreview}
                          width={360}
                          height={360}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className={styles.imageCardPlaceholder}>Image</div>
                    )}
                    <div className={styles.swatchColumn}>
                      <div className={styles.swatchColumnLabel}>Pick the main color</div>
                      {matchesResult?.dominantColors?.length ? (
                        <div className={styles.swatchColumnList}>
                          {matchesResult.dominantColors.map((swatch) => (
                            <button
                              type="button"
                              key={`match-color-${swatch.hex}`}
                              className={`${styles.swatchPill} ${
                                activeMatchBaseColor === swatch.hex ? styles.swatchPillActive : ""
                              }`}
                              onClick={() => onMatchPaletteSelect(swatch.hex)}
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
              ) : (
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Base color</div>
                  <div className={styles.row}>
                    <input
                      type="color"
                      value={matchColor}
                      onChange={(event) => onMatchColorChange(event.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={matchColorText}
                      onChange={(event) => onMatchHexTextChange(event.target.value)}
                      className={`${styles.hexInput} ${!matchColorIsValid ? styles.hexInputInvalid : ""}`}
                      spellCheck={false}
                      autoCapitalize="characters"
                    />
                  </div>
                  <div className={styles.cardHint}>Paste one color code or use the picker, and we’ll show colors that go well with it.</div>
                </div>
              )}
            </>
          )}

          {error ? <div className={styles.errorCard}>{error}</div> : null}
        </div>
      </section>

      {flow === "compare" && result ? (
        <section className={styles.panel}>
          <div className={styles.resultHeader}>
            <div>
              <div className={styles.scoreValue}>{result.score}%</div>
              <div className={styles.scoreCaption}>{appRating} match</div>
            </div>
            <div className={styles.miniPreview}>
              <span style={{ backgroundColor: activeTopColor }} />
              <span style={{ backgroundColor: activeBottomColor }} />
            </div>
          </div>

          <div className={styles.resultBody}>
            <div className={styles.infoCard}>
              <div className={styles.infoTitle}>{summaryTitle}</div>
              <div className={styles.infoLead}>{result.reason}</div>
              <p>{result.summary}</p>
              <p>
                <strong>Overall feel:</strong> {result.styleRead.label}.{" "}
                {result.styleRead.explanation}
              </p>
            </div>

            {result.suggestions.length ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Helpful styling tip</div>
                <ul>
                  {result.suggestions.slice(0, 1).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.avoid.length ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Things to watch</div>
                <ul>
                  {result.avoid.slice(0, 1).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.scoreBreakdown.length ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Why the score landed here</div>
                <div className={styles.breakdownList}>
                  {result.scoreBreakdown.map((item) => (
                    <div key={item.label} className={styles.breakdownRow}>
                      <div className={styles.breakdownCopy}>
                        <div className={styles.breakdownLabel}>{item.label}</div>
                        <div className={styles.breakdownWeight}>{item.weight}% weight</div>
                      </div>
                      <div className={styles.breakdownMeta}>
                        <span className={styles.breakdownValue}>{item.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {flow === "matches" && matchesResult ? (
        <section className={styles.panel}>
          <div className={styles.resultHeader}>
            <div>
              <div className={styles.scoreValue}>{matchesResult.matches.length}</div>
              <div className={styles.scoreCaption}>top matches</div>
            </div>
            <div className={styles.miniPreview}>
              <span style={{ backgroundColor: activeMatchBaseColor }} />
              <span style={{ backgroundColor: topMatch?.hex ?? "#E6DDCF" }} />
            </div>
          </div>

          <div className={styles.resultBody}>
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Top matches for this color</div>
              {matchesResult.needsSelection ? (
                <p>Pick the main color from the photo first, and we’ll suggest the strongest distinct matches.</p>
              ) : (
                <p>These are ranked from best to worst and filtered to stay meaningfully different from each other.</p>
              )}
            </div>

            {topMatchLabel ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Top result</div>
                <div className={styles.infoLead}>{topMatchLabel}</div>
                <p>{topMatch?.reason}</p>
              </div>
            ) : null}

            {matchesResult.matches.length ? (
              <div className={styles.infoCard}>
                <div className={styles.infoTitle}>Suggested combinations</div>
                <div className={styles.matchList}>
                  {matchesResult.matches.map((match) => (
                    <div key={match.hex} className={styles.matchRow}>
                      <div className={styles.matchPair}>
                        <span className={styles.matchSwatch} style={{ backgroundColor: activeMatchBaseColor }} />
                        <span className={styles.matchSwatch} style={{ backgroundColor: match.hex }} />
                      </div>
                      <div className={styles.matchCopy}>
                        <div className={styles.matchLabel}>{match.label}</div>
                        <div className={styles.matchHex}>{match.hex}</div>
                        <div className={styles.matchReason}>{match.reason}</div>
                      </div>
                      <div className={styles.matchMeta}>
                        <div className={styles.matchScore}>{match.score}</div>
                        <button
                          type="button"
                          className={styles.comparePill}
                          onClick={() => onCompareSuggestedMatch(match.hex)}
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
