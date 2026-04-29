"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./color-match-lab.module.css";

type Mode = "colors" | "images";
type PreviewTheme = "light" | "dark";

type Result = {
  score: number;
  rating: string;
  reason: string;
  summary: string;
  harmony: {
    label: string;
    explanation: string;
    hueDifference: number;
  };
  styleRead: {
    label: string;
    explanation: string;
  };
  scoreBreakdown: Array<{
    label: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
  paletteA: Array<{ hex: string; percent: number }>;
  paletteB: Array<{ hex: string; percent: number }>;
  contrastNotes: {
    ratio: number;
    strength: string;
    brightnessDifference: string;
    notes: string[];
  };
  suggestions: string[];
  avoid: string[];
};

type OutfitPreviewProps = {
  colorA: string;
  colorB: string;
  background?: PreviewTheme;
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
          "This browser could not decode that HEIC image for color extraction. Try Safari, or export it as JPG or PNG first.",
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

function OutfitPreview({
  colorA,
  colorB,
  background = "light",
}: OutfitPreviewProps) {
  return (
    <div
      className={`${styles.outfitStage} ${
        background === "dark" ? styles.outfitStageDark : styles.outfitStageLight
      }`}
      role="img"
      aria-label="Outfit color preview"
    >
      <div className={styles.outfitFigure}>
        <div className={styles.colorBlockPreview}>
          <div
            className={`${styles.colorBlockHalf} ${styles.colorBlockTop}`}
            style={{ backgroundColor: colorA }}
          />
          <div className={styles.colorDivider} />
          <div
            className={`${styles.colorBlockHalf} ${styles.colorBlockBottom}`}
            style={{ backgroundColor: colorB }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ColorMatchLabPage() {
  const [mode, setMode] = useState<Mode>("colors");
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>("light");
  const [colorA, setColorA] = useState("#355C7D");
  const [colorB, setColorB] = useState("#D9A066");
  const [colorAText, setColorAText] = useState("#355C7D");
  const [colorBText, setColorBText] = useState("#D9A066");
  const [imageAFile, setImageAFile] = useState<File | null>(null);
  const [imageBFile, setImageBFile] = useState<File | null>(null);
  const [imageAUrl, setImageAUrl] = useState("");
  const [imageBUrl, setImageBUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [selectedPaletteA, setSelectedPaletteA] = useState<string | null>(null);
  const [selectedPaletteB, setSelectedPaletteB] = useState<string | null>(null);
  const colorAIsValid = isValidHexColor(colorAText);
  const colorBIsValid = isValidHexColor(colorBText);

  const previewTopColor =
    mode === "colors" ? colorA : selectedPaletteA ?? result?.paletteA[0]?.hex ?? "#7B8494";
  const previewBottomColor =
    mode === "colors" ? colorB : selectedPaletteB ?? result?.paletteB[0]?.hex ?? "#B18E6B";

  const requestColorComparison = useCallback(async (
    nextColorA: string,
    nextColorB: string,
    paletteAOverride?: Result["paletteA"],
    paletteBOverride?: Result["paletteB"],
  ) => {
    const response = await fetch("/api/color-match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "colors",
        colorA: nextColorA,
        colorB: nextColorB,
      }),
    });

    const data = (await response.json()) as Result & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Could not analyze this comparison.");
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "images",
        imageA: nextImageA,
        imageB: nextImageB,
      }),
    });

    const data = (await response.json()) as Result & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Could not analyze this comparison.");
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
      setLoading(true);
      setError("");
      try {
        await requestColorComparison(colorA, colorB);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not analyze this comparison.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void autoCompareColors();

    return () => {
      cancelled = true;
    };
  }, [colorA, colorAIsValid, colorB, colorBIsValid, mode, requestColorComparison]);

  useEffect(() => {
    if (mode !== "images" || !imageAUrl || !imageBUrl) {
      return;
    }

    let cancelled = false;

    async function autoAnalyze() {
      setLoading(true);
      setError("");
      try {
        await analyzeImagePair(imageAUrl, imageBUrl);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not analyze this comparison.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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

    if (mode !== "images" || !nextA || !nextB || !result) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await requestColorComparison(nextA, nextB, result.paletteA, result.paletteB);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not analyze this comparison.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Experimental private lab</p>
        <h1 className={styles.title}>Color Match Lab</h1>
        <p className={styles.subtitle}>
          Compare two colors, or two photos, and estimate how well the pairing works.
        </p>
        <p className={styles.disclaimer}>
          This score is a visual estimate, not a rule. Lighting, fabric,
          texture, and personal style can change the result.
        </p>
      </header>

      <div className={styles.stack}>
        <section className={styles.panel}>
          <div className={styles.panelInner}>
            <div className={styles.tabs} aria-label="Input mode">
              <button
                type="button"
                className={`${styles.tab} ${mode === "colors" ? styles.tabActive : ""}`}
                onClick={() => setMode("colors")}
              >
                Color picker mode
              </button>
              <button
                type="button"
                className={`${styles.tab} ${mode === "images" ? styles.tabActive : ""}`}
                onClick={() => setMode("images")}
              >
                Image upload mode
              </button>
            </div>

            <div className={styles.composerLayout}>
              <div className={styles.controlsColumn}>
                {mode === "colors" ? (
                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <div className={styles.fieldLabel}>Color A</div>
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
                          inputMode="text"
                          spellCheck={false}
                          autoCapitalize="characters"
                          aria-label="Hex value for Color A"
                        />
                      </div>
                      {!colorAIsValid && <div className={styles.fieldHint}>Enter a 6-digit hex like #355C7D</div>}
                    </div>

                    <div className={styles.field}>
                      <div className={styles.fieldLabel}>Color B</div>
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
                          inputMode="text"
                          spellCheck={false}
                          autoCapitalize="characters"
                          aria-label="Hex value for Color B"
                        />
                      </div>
                      {!colorBIsValid && <div className={styles.fieldHint}>Enter a 6-digit hex like #D9A066</div>}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.grid}>
                      <label className={styles.field}>
                        <div className={styles.fieldLabel}>Image A</div>
                        <div className={styles.fileBox}>
                          <input
                            type="file"
                            accept="image/*"
                            className={styles.fileInput}
                            onChange={(event) =>
                              void onPickImage("A", event.target.files?.[0] ?? null)
                            }
                          />
                        </div>
                        <div className={styles.fieldHint}>
                          {imageAFile ? imageAFile.name : "Choose the first image"}
                        </div>
                      </label>

                      <label className={styles.field}>
                        <div className={styles.fieldLabel}>Image B</div>
                        <div className={styles.fileBox}>
                          <input
                            type="file"
                            accept="image/*"
                            className={styles.fileInput}
                            onChange={(event) =>
                              void onPickImage("B", event.target.files?.[0] ?? null)
                            }
                          />
                        </div>
                        <div className={styles.fieldHint}>
                          {imageBFile ? imageBFile.name : "Choose the second image"}
                        </div>
                      </label>
                    </div>

                    {(imageAUrl || imageBUrl) && (
                      <div className={styles.previewGrid}>
                        <div className={styles.previewCard}>
                          <div className={styles.previewFrame}>
                            {imageAUrl && (
                              <NextImage
                                src={imageAUrl}
                                alt="Preview for image A"
                                className={styles.previewImage}
                                width={720}
                                height={720}
                                unoptimized
                              />
                            )}
                          </div>
                          <div className={styles.previewMeta}>Image A preview</div>
                          {result?.paletteA?.length ? (
                            <div className={styles.inlineSwatchSection}>
                              <div className={styles.inlineSwatchLabel}>Pick the top color</div>
                              <div className={styles.inlineSwatchList}>
                                {result.paletteA.map((swatch) => (
                                  <button
                                    type="button"
                                    key={`inline-a-${swatch.hex}`}
                                    className={`${styles.inlineSwatchButton} ${
                                      previewTopColor === swatch.hex
                                        ? styles.inlineSwatchButtonActive
                                        : ""
                                    }`}
                                    onClick={() => void onPaletteSwatchSelect("A", swatch.hex)}
                                  >
                                    <span
                                      className={styles.inlineSwatchChip}
                                      style={{ backgroundColor: swatch.hex }}
                                    />
                                    <span className={styles.inlineSwatchText}>{swatch.hex}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.previewCard}>
                          <div className={styles.previewFrame}>
                            {imageBUrl && (
                              <NextImage
                                src={imageBUrl}
                                alt="Preview for image B"
                                className={styles.previewImage}
                                width={720}
                                height={720}
                                unoptimized
                              />
                            )}
                          </div>
                          <div className={styles.previewMeta}>Image B preview</div>
                          {result?.paletteB?.length ? (
                            <div className={styles.inlineSwatchSection}>
                              <div className={styles.inlineSwatchLabel}>Pick the bottom color</div>
                              <div className={styles.inlineSwatchList}>
                                {result.paletteB.map((swatch) => (
                                  <button
                                    type="button"
                                    key={`inline-b-${swatch.hex}`}
                                    className={`${styles.inlineSwatchButton} ${
                                      previewBottomColor === swatch.hex
                                        ? styles.inlineSwatchButtonActive
                                        : ""
                                    }`}
                                    onClick={() => void onPaletteSwatchSelect("B", swatch.hex)}
                                  >
                                    <span
                                      className={styles.inlineSwatchChip}
                                      style={{ backgroundColor: swatch.hex }}
                                    />
                                    <span className={styles.inlineSwatchText}>{swatch.hex}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className={styles.composerFooter}>
                  <div className={styles.previewControls}>
                    <div className={styles.toggleBlock}>
                      <div className={styles.fieldLabel}>Preview background</div>
                      <div className={styles.toggleGroup} aria-label="Preview background">
                        <button
                          type="button"
                          className={`${styles.toggleButton} ${previewTheme === "light" ? styles.toggleButtonActive : ""}`}
                          onClick={() => setPreviewTheme("light")}
                        >
                          Light
                        </button>
                        <button
                          type="button"
                          className={`${styles.toggleButton} ${previewTheme === "dark" ? styles.toggleButtonActive : ""}`}
                          onClick={() => setPreviewTheme("dark")}
                        >
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.actionRow}>
                    <span className={styles.autoCompareHint}>
                      {mode === "colors"
                        ? "This updates automatically. Change either color or paste a hex value to try a new pairing."
                        : loading
                          ? "Pulling dominant colors and recalculating..."
                          : imageAUrl && imageBUrl
                            ? "Colors are analyzed automatically once both images are loaded. Tap a swatch to try a different pairing."
                            : "Upload both images and we will pull color options automatically."}
                    </span>

                    {error && <span className={styles.error}>{error}</span>}
                  </div>
                </div>
              </div>

              <div className={styles.previewColumn}>
                <div className={styles.previewHeader}>
                  <div>
                    <div className={styles.subTitle}>Color preview</div>
                    <p className={styles.fieldHint}>
                      A simple split preview using the current colors.
                    </p>
                  </div>
                </div>

                <OutfitPreview
                  colorA={previewTopColor}
                  colorB={previewBottomColor}
                  background={previewTheme}
                />
              </div>
            </div>
          </div>
        </section>

        {result && (
          <section className={styles.panel}>
            <div className={styles.panelInner}>
              <div className={styles.resultTop}>
                <div
                  className={styles.scoreRing}
                  style={
                    {
                      "--score-angle": `${(result.score / 100) * 360}deg`,
                    } as React.CSSProperties
                  }
                >
                  <div className={styles.scoreInner}>
                    <div>
                      <div className={styles.scoreValue}>{result.score}%</div>
                      <div className={styles.scoreLabel}>compatibility</div>
                    </div>
                  </div>
                </div>

                <div className={styles.summaryBox} style={{ padding: 14 }}>
                  <div className={styles.rating}>{result.rating}</div>
                  <p className={styles.reason}>{result.reason}</p>
                </div>
              </div>

              <div className={styles.infoStack}>
                <div className={styles.summaryBox} style={{ padding: 14 }}>
                  <div className={styles.subTitle}>Why it works</div>
                  <p className={styles.reason}>{result.summary}</p>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.summaryBox} style={{ padding: 14 }}>
                    <div className={styles.subTitle}>Easy to wear together</div>
                    <div className={styles.infoLabel}>{result.harmony.label}</div>
                    <p className={styles.reason}>{result.harmony.explanation}</p>
                  </div>

                  <div className={styles.summaryBox} style={{ padding: 14 }}>
                    <div className={styles.subTitle}>Look feels</div>
                    <div className={styles.infoLabel}>{result.styleRead.label}</div>
                    <p className={styles.reason}>{result.styleRead.explanation}</p>
                  </div>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.summaryBox} style={{ padding: 14 }}>
                  <div className={styles.subTitle}>Dominant colors from image A</div>
                  <div className={styles.swatchList}>
                    {result.paletteA.map((swatch) => (
                      <button
                        type="button"
                        key={`a-${swatch.hex}`}
                        className={`${styles.swatchRowButton} ${
                          mode === "images" && previewTopColor === swatch.hex
                            ? styles.swatchRowButtonActive
                            : ""
                        }`}
                        onClick={() => void onPaletteSwatchSelect("A", swatch.hex)}
                        disabled={mode !== "images"}
                      >
                        <div className={styles.swatchRow}>
                          <div
                            className={styles.swatch}
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <div className={styles.swatchHex}>{swatch.hex}</div>
                          <div className={styles.swatchPercent}>{swatch.percent}%</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.summaryBox} style={{ padding: 14 }}>
                  <div className={styles.subTitle}>Dominant colors from image B</div>
                  <div className={styles.swatchList}>
                    {result.paletteB.map((swatch) => (
                      <button
                        type="button"
                        key={`b-${swatch.hex}`}
                        className={`${styles.swatchRowButton} ${
                          mode === "images" && previewBottomColor === swatch.hex
                            ? styles.swatchRowButtonActive
                            : ""
                        }`}
                        onClick={() => void onPaletteSwatchSelect("B", swatch.hex)}
                        disabled={mode !== "images"}
                      >
                        <div className={styles.swatchRow}>
                          <div
                            className={styles.swatch}
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <div className={styles.swatchHex}>{swatch.hex}</div>
                          <div className={styles.swatchPercent}>{swatch.percent}%</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.summaryBox} style={{ padding: 14, marginTop: 18 }}>
                <div className={styles.subTitle}>Why the score landed here</div>
                <div className={styles.breakdownList}>
                  {result.scoreBreakdown.map((item) => (
                    <div key={item.label} className={styles.breakdownRow}>
                      <div>
                        <div className={styles.breakdownLabel}>{item.label}</div>
                        <div className={styles.breakdownExplanation}>
                          {item.explanation}
                        </div>
                      </div>
                      <div className={styles.breakdownRight}>
                        <div className={styles.breakdownScore}>{item.score}</div>
                        <div className={styles.breakdownWeight}>
                          {item.weight}% weight
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.accessGrid}>
                <div className={styles.accessBox}>
                  <div className={styles.subTitle}>Do they stand apart?</div>
                  <div className={styles.accessGrid}>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Contrast</span>
                      <span className={styles.metricValue}>
                        {result.contrastNotes.ratio}:1
                      </span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>How clear it looks</span>
                      <span className={styles.metricValue}>
                        {result.contrastNotes.strength}
                      </span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Light + dark mix</span>
                      <span className={styles.metricValue}>
                        {result.contrastNotes.brightnessDifference}
                      </span>
                    </div>
                    <ul className={styles.notesList}>
                      {result.contrastNotes.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className={styles.detailGrid} style={{ marginTop: 18 }}>
                <div className={styles.summaryBox} style={{ padding: 14 }}>
                  <div className={styles.subTitle}>Styling tip</div>
                  <ul className={styles.notesList}>
                    {result.suggestions.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.summaryBox} style={{ padding: 14 }}>
                  <div className={styles.subTitle}>Things to watch</div>
                  <ul className={styles.notesList}>
                    {result.avoid.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
