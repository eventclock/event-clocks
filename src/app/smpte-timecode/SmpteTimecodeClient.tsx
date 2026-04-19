"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./smpte-timecode.module.css";
import {
  FRAME_RATE_OPTIONS,
  parseSmpteTimecode,
  convertSmpteToRealMilliseconds,
  convertTotalFramesToMilliseconds,
  formatMilliseconds,
  formatTotalFramesAsSmpte,
  getFrameRateOption,
  type FrameRateKey,
  type SmpteConversionResult,
} from "@/lib/smpteTimecode";

type InputMetric = "smpte" | "smpteFree" | "frames" | "milliseconds";
type ColumnMetric =
  | "smpte"
  | "formattedTime"
  | "milliseconds"
  | "frames";

type Column = {
  id: string;
  metric: ColumnMetric;
  frameRateKey: FrameRateKey;
  deltaFromId: string | null;
};

type ParsedSourceRow = {
  id: string;
  lineNumber: number;
  value: string;
  sourceMetric: InputMetric;
  sourceMilliseconds: number | null;
  numericValue: number | null;
  previewFormatted: string | null;
  error: string | null;
};

type RowCell = {
  columnId: string;
  conversion: SmpteConversionResult;
  smpteLabel: string | null;
  frameValue: number | null;
};

const INPUT_METRIC_OPTIONS: { value: InputMetric; label: string; shortLabel: string }[] = [
  { value: "smpteFree", label: "SMPTE (No Rate)", shortLabel: "SMPTE" },
  { value: "smpte", label: "SMPTE", shortLabel: "SMPTE" },
  { value: "frames", label: "Frames", shortLabel: "Frames" },
  { value: "milliseconds", label: "Milliseconds", shortLabel: "MS" },
];

const METRIC_OPTIONS: { value: ColumnMetric; label: string; shortLabel: string }[] = [
  { value: "smpte", label: "SMPTE", shortLabel: "SMPTE" },
  { value: "formattedTime", label: "Formatted Time", shortLabel: "Time" },
  { value: "milliseconds", label: "Milliseconds", shortLabel: "MS" },
  { value: "frames", label: "Frames", shortLabel: "Frames" },
];

const INITIAL_COLUMNS: Column[] = [
  { id: "col-1", metric: "formattedTime", frameRateKey: "24", deltaFromId: null },
];

const DEFAULT_INPUT_BY_METRIC: Record<InputMetric, string> = {
  smpte: ["01:00:00:00", "00:10:00;00", "00:01:23:12"].join("\n"),
  smpteFree: ["01:00:00:00", "00:10:00:00", "00:01:23:12"].join("\n"),
  frames: ["86400", "38143", "17532"].join("\n"),
  milliseconds: ["3600000", "600600", "83417"].join("\n"),
};

const STORAGE_KEY = "event-clocks-smpte-converter-state";

const SIMPLIFIED_RATE_KEYS: FrameRateKey[] = [
  "23.976",
  "24",
  "25",
  "29.97 NDF",
  "30",
  "47.952",
  "48",
  "50",
  "59.94 NDF",
  "60",
  "100",
  "119.88",
  "120",
];

const FAQ_ITEMS = [
  {
    question: "Why does the converter use 30 instead of 29.97 for frame counting?",
    answer:
      "SMPTE timecode labels are counted using the nominal integer frame rate. For example, 23.976 uses 24 labels per second, 29.97 uses 30, and 59.94 uses 60. Real elapsed time is calculated afterward using the exact playback-rate ratio.",
  },
  {
    question: "What is the difference between nominal fps and real fps?",
    answer:
      "Nominal fps is the integer rate used for timecode labels. Real fps is the actual playback speed. For example, 29.97 uses nominal 30, while the exact playback rate is 30000/1001.",
  },
  {
    question: "Does drop-frame remove actual video frames?",
    answer:
      "No. Drop-frame timecode does not remove footage. It skips certain frame numbers in the label sequence so the displayed timecode stays aligned with real elapsed time.",
  },
  {
    question: "Why are some drop-frame values invalid?",
    answer:
      "In drop-frame formats such as 29.97 DF and 59.94 DF, certain labels are skipped at the start of most minutes except every 10th minute. Those skipped labels are invalid inputs.",
  },
  {
    question: "Why is every 10th minute special in drop-frame?",
    answer:
      "Drop-frame skips labels in most minutes, but not every 10th minute. That pattern keeps long-running timecode close to clock time without skipping actual media frames.",
  },
  {
    question: "Why does 01:00:00;00 differ from 01:00:00:00?",
    answer:
      "The semicolon usually indicates drop-frame while the colon usually indicates non-drop-frame. They are different counting systems and can produce different real-time values when interpreted directly.",
  },
  {
    question: "Why does my timecode drift?",
    answer:
      "Drift usually comes from using the wrong frame rate or wrong DF/NDF mode, such as using 30 instead of 29.97 or NDF instead of DF.",
  },
  {
    question: "How are milliseconds calculated?",
    answer:
      "The converter first counts total frames from the source value, then converts those frames into real elapsed time using the exact frame-rate ratio, such as 30000/1001.",
  },
  {
    question: "What is SMPTE (No Rate)?",
    answer:
      "Use SMPTE (No Rate) when you have a label like 01:00:00:00 but do not want to commit to a source timing system yet. In that mode, each output column applies its own rate and DF/NDF rules to the same raw SMPTE label.",
  },
] as const;

type PersistedState = {
  inputMetric: InputMetric;
  sourceRateKey: FrameRateKey;
  input: string;
  columns: Column[];
  nextMetric: ColumnMetric;
  nextColumnKey: FrameRateKey;
  columnCounter: number;
};

function getDefaultState(): PersistedState {
  return {
    inputMetric: "smpteFree",
    sourceRateKey: "24",
    input: DEFAULT_INPUT_BY_METRIC.smpteFree,
    columns: INITIAL_COLUMNS,
    nextMetric: "formattedTime",
    nextColumnKey: "29.97 DF",
    columnCounter: 2,
  };
}

function isInputMetric(value: unknown): value is InputMetric {
  return value === "smpte" || value === "smpteFree" || value === "frames" || value === "milliseconds";
}

function isColumnMetric(value: unknown): value is ColumnMetric {
  return value === "smpte" || value === "formattedTime" || value === "milliseconds" || value === "frames";
}

function isFrameRateKey(value: unknown): value is FrameRateKey {
  return typeof value === "string" && FRAME_RATE_OPTIONS.some((option) => option.key === value);
}

function loadPersistedState(): PersistedState {
  const defaults = getDefaultState();
  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const persistedInputMetric = isInputMetric(parsed.inputMetric) ? parsed.inputMetric : defaults.inputMetric;
    const columns = Array.isArray(parsed.columns)
      ? parsed.columns
          .filter(
            (column): column is Column =>
              typeof column === "object" &&
              column !== null &&
              typeof column.id === "string" &&
              isColumnMetric(column.metric) &&
              isFrameRateKey(column.frameRateKey) &&
              (typeof column.deltaFromId === "string" || column.deltaFromId === null)
          )
          .map((column) => ({
            ...column,
            frameRateKey: normalizeOutputRateKey(column.metric, persistedInputMetric, column.frameRateKey),
          }))
      : defaults.columns;

    return {
      inputMetric: persistedInputMetric,
      sourceRateKey: isFrameRateKey(parsed.sourceRateKey) ? parsed.sourceRateKey : defaults.sourceRateKey,
      input: typeof parsed.input === "string" ? parsed.input : defaults.input,
      columns: sanitizeColumns(columns.length > 0 ? columns : defaults.columns),
      nextMetric: isColumnMetric(parsed.nextMetric) ? parsed.nextMetric : defaults.nextMetric,
      nextColumnKey: isFrameRateKey(parsed.nextColumnKey)
        ? normalizeOutputRateKey(
            isColumnMetric(parsed.nextMetric) ? parsed.nextMetric : defaults.nextMetric,
            persistedInputMetric,
            parsed.nextColumnKey
          )
        : defaults.nextColumnKey,
      columnCounter:
        typeof parsed.columnCounter === "number" && parsed.columnCounter >= 2
          ? Math.floor(parsed.columnCounter)
          : defaults.columnCounter,
    };
  } catch {
    return defaults;
  }
}

function createColumn(metric: ColumnMetric, frameRateKey: FrameRateKey, count: number): Column {
  return {
    id: `col-${count}`,
    metric,
    frameRateKey,
    deltaFromId: null,
  };
}

function sanitizeColumns(columns: Column[]): Column[] {
  return columns.map((column, index) => {
    const allowedLeftIds = new Set(
      columns
        .slice(0, index)
        .filter((candidate) => candidate.metric === column.metric)
        .map((candidate) => candidate.id)
    );

    return {
      ...column,
      deltaFromId: !isDeltaEligible(column.metric)
        ? null
        : index === 0 || !column.deltaFromId || !allowedLeftIds.has(column.deltaFromId)
          ? null
          : column.deltaFromId,
    };
  });
}

function getMetricOption(metric: ColumnMetric) {
  return METRIC_OPTIONS.find((option) => option.value === metric)!;
}

function doesOutputRateMatter(metric: ColumnMetric, inputMetric: InputMetric) {
  if (inputMetric === "smpteFree") {
    return true;
  }

  return metric === "smpte" || metric === "frames";
}

function getColumnRateOptions(metric: ColumnMetric, inputMetric: InputMetric) {
  if (inputMetric !== "smpteFree" && metric === "frames") {
    return FRAME_RATE_OPTIONS.filter((option) => SIMPLIFIED_RATE_KEYS.includes(option.key));
  }

  return FRAME_RATE_OPTIONS;
}

function normalizeOutputRateKey(
  metric: ColumnMetric,
  inputMetric: InputMetric,
  frameRateKey: FrameRateKey
): FrameRateKey {
  if (inputMetric !== "smpteFree" && metric === "frames") {
    return frameRateKey === "29.97 DF"
      ? "29.97 NDF"
      : frameRateKey === "59.94 DF"
        ? "59.94 NDF"
        : frameRateKey;
  }

  return frameRateKey;
}

function getDisplayRateLabel(column: Column, inputMetric: InputMetric) {
  if (!doesOutputRateMatter(column.metric, inputMetric)) {
    return null;
  }

  const label = getFrameRateOption(column.frameRateKey).label;

  if (inputMetric === "smpteFree" || column.metric !== "frames") {
    return label;
  }

  return label
    .replace(" DF", "")
    .replace(" NDF", "");
}

function getColumnTitle(column: Column, inputMetric: InputMetric) {
  const rateLabel = getDisplayRateLabel(column, inputMetric);
  return rateLabel ? `${getMetricOption(column.metric).label} @ ${rateLabel}` : getMetricOption(column.metric).label;
}

function isDeltaEligible(metric: ColumnMetric) {
  return (
    metric === "formattedTime" ||
    metric === "milliseconds" ||
    metric === "frames"
  );
}

function parseIntegerLikeValue(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

function buildInvalidConversion(error: string): SmpteConversionResult {
  return {
    ok: false,
    error,
    errorCode: "invalid_format",
  };
}

function convertMillisecondsToOutput(milliseconds: number, frameRateKey: FrameRateKey): SmpteConversionResult {
  const frameRate = getFrameRateOption(frameRateKey);
  const totalFrames = Math.round(
    (milliseconds * frameRate.fpsNumerator) / (frameRate.fpsDenominator * 1000)
  );

  return {
    ok: true,
    totalFrames,
    milliseconds,
    formatted: formatMilliseconds(milliseconds),
    parsed: {
      hours: 0,
      minutes: 0,
      seconds: 0,
      frames: 0,
      separator: frameRate.isDropFrame ? ";" : ":",
    },
    interpretedSeparator: frameRate.isDropFrame ? ";" : ":",
    interpretationApplied: false,
  };
}

function parseSourceRows(
  input: string,
  inputMetric: InputMetric,
  sourceRateKey: FrameRateKey
): ParsedSourceRow[] {
  return input
    .split(/\r?\n/)
    .map((raw, index) => ({
      raw,
      index,
    }))
    .filter(({ raw }) => raw.trim().length > 0)
    .map(({ raw, index }) => {
      const value = raw.trim();

      if (inputMetric === "smpte") {
        const conversion = convertSmpteToRealMilliseconds(value, sourceRateKey);
        return {
          id: `line-${index + 1}-${raw}`,
          lineNumber: index + 1,
          value,
          sourceMetric: inputMetric,
          sourceMilliseconds: conversion.ok ? conversion.milliseconds : null,
          numericValue: null,
          previewFormatted: conversion.ok ? conversion.formatted : null,
          error: conversion.ok
            ? null
            : conversion.errorCode === "invalid_df"
              ? "Invalid DF"
              : conversion.error,
        };
      }

      if (inputMetric === "smpteFree") {
        const parsed = parseSmpteTimecode(value);
        return {
          id: `line-${index + 1}-${raw}`,
          lineNumber: index + 1,
          value,
          sourceMetric: inputMetric,
          sourceMilliseconds: null,
          numericValue: null,
          previewFormatted: null,
          error: parsed.ok ? null : parsed.error,
        };
      }

      const parsed = parseIntegerLikeValue(value);
      if (parsed === null) {
        return {
          id: `line-${index + 1}-${raw}`,
          lineNumber: index + 1,
          value,
          sourceMetric: inputMetric,
          sourceMilliseconds: null,
          numericValue: null,
          previewFormatted: null,
          error:
            inputMetric === "milliseconds"
              ? "Use whole-number milliseconds, one per line."
              : "Use whole-number frame counts, one per line.",
        };
      }

      if (inputMetric === "milliseconds") {
        return {
          id: `line-${index + 1}-${raw}`,
          lineNumber: index + 1,
          value,
          sourceMetric: inputMetric,
          sourceMilliseconds: parsed,
          numericValue: parsed,
          previewFormatted: formatMilliseconds(parsed),
          error: null,
        };
      }

      const milliseconds = convertTotalFramesToMilliseconds(
        parsed,
        getFrameRateOption(sourceRateKey).fpsNumerator,
        getFrameRateOption(sourceRateKey).fpsDenominator
      );

      return {
        id: `line-${index + 1}-${raw}`,
        lineNumber: index + 1,
        value,
        sourceMetric: inputMetric,
        sourceMilliseconds: milliseconds,
        numericValue: parsed,
        previewFormatted: formatMilliseconds(milliseconds),
        error: null,
      };
    });
}

function buildOutputCell(column: Column, conversion: SmpteConversionResult): RowCell {
  if (!conversion.ok) {
    return {
      columnId: column.id,
      conversion,
      smpteLabel: null,
      frameValue: null,
    };
  }

  const smpteLabel = formatTotalFramesAsSmpte(conversion.totalFrames, column.frameRateKey);
  return {
    columnId: column.id,
    conversion,
    smpteLabel,
    frameValue: conversion.totalFrames,
  };
}

function computeCellConversion(row: ParsedSourceRow, column: Column): SmpteConversionResult {
  if (row.sourceMetric === "smpteFree") {
    return row.error ? buildInvalidConversion(row.error) : convertSmpteToRealMilliseconds(row.value, column.frameRateKey);
  }

  return row.sourceMilliseconds === null
    ? buildInvalidConversion(row.error ?? "Invalid input")
    : convertMillisecondsToOutput(row.sourceMilliseconds, column.frameRateKey);
}

function formatMillisecondDelta(ms: number): string {
  const sign = ms > 0 ? "+" : ms < 0 ? "-" : "±";
  const abs = Math.abs(ms);
  return `${sign}${abs.toLocaleString()} ms (${sign === "±" ? "" : sign}${formatMilliseconds(abs)})`;
}

function getMetricDescription(metric: ColumnMetric): string | null {
  if (metric === "frames") {
    return "Elapsed frames for the interpreted value at the target playback rate.";
  }

  if (metric === "formattedTime" || metric === "milliseconds") {
    return "Uses the parsed source duration directly in conversion mode, so no target rate is needed.";
  }

  return null;
}

function getInputHeaderLabel(inputMetric: InputMetric, sourceRateKey: FrameRateKey): string {
  if (inputMetric === "milliseconds") {
    return "Milliseconds";
  }

  if (inputMetric === "smpteFree") {
    return "SMPTE (No Rate)";
  }

  const metricLabel = inputMetric === "smpte" ? "SMPTE" : "Frames";
  return `${metricLabel} @ ${getFrameRateOption(sourceRateKey).label}`;
}

export default function SmpteTimecodeClient() {
  const [inputMetric, setInputMetric] = useState<InputMetric>("smpteFree");
  const [sourceRateKey, setSourceRateKey] = useState<FrameRateKey>("24");
  const [input, setInput] = useState(DEFAULT_INPUT_BY_METRIC.smpteFree);
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS);
  const [nextMetric, setNextMetric] = useState<ColumnMetric>("formattedTime");
  const [nextColumnKey, setNextColumnKey] = useState<FrameRateKey>("29.97 DF");
  const [columnCounter, setColumnCounter] = useState(2);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);

  const parsedRows = useMemo(() => {
    return parseSourceRows(input, inputMetric, sourceRateKey);
  }, [input, inputMetric, sourceRateKey]);

  const rows = useMemo(() => {
    return parsedRows.map((row) => {
      const cells: RowCell[] = columns.map((column) => {
        return buildOutputCell(column, computeCellConversion(row, column));
      });

      return {
        ...row,
        cells,
        rowInvalid: Boolean(row.error),
        firstError: row.error,
      };
    });
  }, [columns, parsedRows]);

  const columnLookup = useMemo(() => {
    return new Map(columns.map((column) => [column.id, column]));
  }, [columns]);

  function handleNextMetricChange(metric: ColumnMetric) {
    setNextMetric(metric);
    setNextColumnKey((current) => normalizeOutputRateKey(metric, inputMetric, current));
  }

  function handleAddColumn() {
    setColumns((current) => [
      ...current,
      createColumn(nextMetric, normalizeOutputRateKey(nextMetric, inputMetric, nextColumnKey), columnCounter),
    ]);
    setColumnCounter((current) => current + 1);
  }

  function handleMetricChange(columnId: string, metric: ColumnMetric) {
    setColumns((current) =>
      sanitizeColumns(current.map((column) => {
        if (column.id !== columnId) return column;

        return {
          ...column,
          metric,
          frameRateKey: normalizeOutputRateKey(metric, inputMetric, column.frameRateKey),
          deltaFromId: isDeltaEligible(metric) ? column.deltaFromId : null,
        };
      }))
    );
  }

  function handleFrameRateChange(columnId: string, frameRateKey: FrameRateKey) {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? { ...column, frameRateKey: normalizeOutputRateKey(column.metric, inputMetric, frameRateKey) }
          : column
      )
    );
  }

  function handleDeltaChange(columnId: string, deltaFromId: string) {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, deltaFromId: deltaFromId || null } : column
      )
    );
  }

  function handleRemoveColumn(columnId: string) {
    setColumns((current) => {
      const remaining = current.filter((column) => column.id !== columnId);
      return sanitizeColumns(remaining);
    });
  }

  function handleColumnDrop(targetColumnId: string) {
    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      return;
    }

    setColumns((current) => {
      const fromIndex = current.findIndex((column) => column.id === draggedColumnId);
      const toIndex = current.findIndex((column) => column.id === targetColumnId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const reordered = [...current];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return sanitizeColumns(reordered);
    });
    setDraggedColumnId(null);
  }

  function handleInputMetricChange(nextMetricValue: InputMetric) {
    setInputMetric(nextMetricValue);
    setInput(DEFAULT_INPUT_BY_METRIC[nextMetricValue]);
    setColumns((current) =>
      sanitizeColumns(
        current.map((column) => ({
          ...column,
          frameRateKey: normalizeOutputRateKey(column.metric, nextMetricValue, column.frameRateKey),
        }))
      )
    );
    setNextColumnKey((current) => normalizeOutputRateKey(nextMetric, nextMetricValue, current));
  }

  const inputLabel =
    inputMetric === "smpte" || inputMetric === "smpteFree"
      ? "SMPTE values"
      : inputMetric === "frames"
        ? "Frame counts"
        : "Milliseconds";
  const inputHelper =
    inputMetric === "smpte"
      ? "One SMPTE value per line"
      : inputMetric === "smpteFree"
        ? "One SMPTE label per line. Output columns apply the rate."
      : inputMetric === "frames"
        ? "Whole-number frame counts, one per line"
        : "Whole-number milliseconds, one per line";
  const inputPlaceholder = DEFAULT_INPUT_BY_METRIC[inputMetric];
  const valueHeader = getInputHeaderLabel(inputMetric, sourceRateKey);
  const sourceRateNeeded = inputMetric !== "milliseconds" && inputMetric !== "smpteFree";
  const nextMetricDescription = getMetricDescription(nextMetric);
  const nextColumnRateNeeded = doesOutputRateMatter(nextMetric, inputMetric);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const persisted = loadPersistedState();
      setInputMetric(persisted.inputMetric);
      setSourceRateKey(persisted.sourceRateKey);
      setInput(persisted.input);
      setColumns(persisted.columns);
      setNextMetric(persisted.nextMetric);
      setNextColumnKey(persisted.nextColumnKey);
      setColumnCounter(persisted.columnCounter);
      setHasLoadedPersistedState(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        inputMetric,
        sourceRateKey,
        input,
        columns,
        nextMetric,
        nextColumnKey,
        columnCounter,
      } satisfies PersistedState)
    );
  }, [
    columnCounter,
    columns,
    hasLoadedPersistedState,
    input,
    inputMetric,
    nextColumnKey,
    nextMetric,
    sourceRateKey,
  ]);

  function handleReset() {
    const defaults = getDefaultState();
    setInputMetric(defaults.inputMetric);
    setSourceRateKey(defaults.sourceRateKey);
    setInput(defaults.input);
    setColumns(defaults.columns);
    setNextMetric(defaults.nextMetric);
    setNextColumnKey(defaults.nextColumnKey);
    setColumnCounter(defaults.columnCounter);
    setDraggedColumnId(null);
    setHasLoadedPersistedState(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    }
  }

  function scrollToInfoSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className={styles.shell}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Timecode Converter</h1>
        <p className={styles.subtitle}>
          Convert between SMPTE timecode, frame counts, milliseconds, and real-time durations across
          multiple frame rates, including drop-frame and non-drop-frame formats.
        </p>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.infoTrigger}
            onClick={() => scrollToInfoSection("how-it-works")}
          >
            How it works
          </button>

          <button
            type="button"
            className={styles.infoTrigger}
            onClick={() => scrollToInfoSection("faq")}
          >
            FAQ
          </button>

          <button
            type="button"
            className={styles.secondaryAction}
            onClick={handleReset}
            aria-label="Reset converter"
            title="Reset"
          >
            Reset
          </button>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.controlGrid}>
          <div className={styles.field}>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="input-metric" className={styles.label}>
                  Input Metric
                </label>
              </div>

              <div className={styles.addRow}>
                <select
                  id="input-metric"
                  className={styles.select}
                  value={inputMetric}
                  onChange={(event) => handleInputMetricChange(event.target.value as InputMetric)}
                >
                  {INPUT_METRIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.select}
                  value={sourceRateKey}
                  onChange={(event) => setSourceRateKey(event.target.value as FrameRateKey)}
                  disabled={!sourceRateNeeded}
                  aria-label="Input rate or format"
                >
                  {FRAME_RATE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.helper}>
                {sourceRateNeeded
                  ? "Input rate / format"
                  : inputMetric === "milliseconds"
                    ? "Rate not used for milliseconds"
                    : "No source rate. Output columns interpret the label."}
              </div>
            </div>

            <div className={styles.labelRow}>
              <label htmlFor="source-input" className={styles.label}>
                {inputLabel}
              </label>
              <span className={styles.helper}>{inputHelper}</span>
            </div>

            <textarea
              id="source-input"
              className={styles.textarea}
              spellCheck={false}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={inputPlaceholder}
            />
          </div>

          <div className={styles.sideCard}>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Output Columns</span>
                <span className={styles.helper}>{columns.length} active</span>
              </div>

              <div className={styles.addRow}>
                <select
                  className={styles.select}
                  value={nextMetric}
                  onChange={(event) => handleNextMetricChange(event.target.value as ColumnMetric)}
                >
                  {METRIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  className={`${styles.select} ${!nextColumnRateNeeded ? styles.selectDisabled : ""}`}
                  value={nextColumnKey}
                  onChange={(event) => setNextColumnKey(event.target.value as FrameRateKey)}
                  disabled={!nextColumnRateNeeded}
                  aria-label="Output rate or format"
                >
                  {nextColumnRateNeeded ? (
                    getColumnRateOptions(nextMetric, inputMetric).map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value={nextColumnKey}>Rate not used</option>
                  )}
                </select>

                <button type="button" className={styles.button} onClick={handleAddColumn}>
                  Add column
                </button>
              </div>

              {nextMetricDescription ? (
                <div className={styles.helper}>{nextMetricDescription}</div>
              ) : null}
            </div>

            <div className={styles.columnList}>
              {columns.map((column, index) => (
                <span key={column.id} className={styles.chip}>
                  {getColumnTitle(column, inputMetric)}
                  <span className={styles.chipMuted}>
                    {!isDeltaEligible(column.metric)
                      ? "no Δ"
                      : index === 0
                        ? "base"
                        : column.deltaFromId
                          ? `Δ ${getColumnTitle(columnLookup.get(column.deltaFromId)!, inputMetric)}`
                          : "Δ select"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {parsedRows.length === 0 ? (
          <div className={styles.emptyState}>
            Paste one {INPUT_METRIC_OPTIONS.find((option) => option.value === inputMetric)?.label.toLowerCase()} value per line to generate the comparison table.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={styles.tableSurface}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.headCell} ${styles.timecodeHead}`}>{valueHeader}</th>
                    {columns.map((column, index) => {
                      const leftColumns = columns
                        .slice(0, index)
                        .filter((candidate) => candidate.metric === column.metric);
                      const columnRateNeeded = doesOutputRateMatter(column.metric, inputMetric);
                      const columnRateOptions = getColumnRateOptions(column.metric, inputMetric);

                      return (
                        <th
                          key={column.id}
                          className={`${styles.headCell} ${draggedColumnId === column.id ? styles.draggingHead : ""}`}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleColumnDrop(column.id)}
                        >
                          <div className={styles.headerTop}>
                            <button
                              type="button"
                              className={styles.dragHandle}
                              draggable
                              onDragStart={() => setDraggedColumnId(column.id)}
                              onDragEnd={() => setDraggedColumnId(null)}
                              aria-label={`Reorder ${getColumnTitle(column, inputMetric)} column`}
                              title="Drag to reorder"
                            >
                              <span className={styles.dragDots} aria-hidden="true" />
                            </button>

                            <select
                              className={`${styles.select} ${styles.headerMetricSelect}`}
                              value={column.metric}
                              onChange={(event) =>
                                handleMetricChange(column.id, event.target.value as ColumnMetric)
                              }
                              aria-label={`Metric for column ${index + 1}`}
                            >
                              {METRIC_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.shortLabel}
                                </option>
                              ))}
                            </select>

                            <select
                              className={`${styles.select} ${styles.headerSelect} ${!columnRateNeeded ? styles.selectDisabled : ""}`}
                              value={column.frameRateKey}
                              onChange={(event) =>
                                handleFrameRateChange(column.id, event.target.value as FrameRateKey)
                              }
                              aria-label={`Frame rate for column ${index + 1}`}
                              disabled={!columnRateNeeded}
                            >
                              {columnRateNeeded ? (
                                columnRateOptions.map((option) => (
                                  <option key={option.key} value={option.key}>
                                    {option.label}
                                  </option>
                                ))
                              ) : (
                                <option value={column.frameRateKey}>Rate not used</option>
                              )}
                            </select>

                            <button
                              type="button"
                              className={styles.removeButton}
                              onClick={() => handleRemoveColumn(column.id)}
                              disabled={columns.length === 1}
                              aria-label={`Remove ${column.frameRateKey} column`}
                              title="Remove column"
                            >
                              ×
                            </button>
                          </div>

                          <div className={styles.columnTitle}>{getColumnTitle(column, inputMetric)}</div>

                          {index > 0 && isDeltaEligible(column.metric) ? (
                            <div className={styles.deltaWrap}>
                              <span className={styles.deltaLabel}>Delta</span>
                              <select
                                className={styles.deltaSelect}
                                value={column.deltaFromId ?? ""}
                                onChange={(event) => handleDeltaChange(column.id, event.target.value)}
                              >
                                <option value="">Δ: select</option>
                                {leftColumns.map((leftColumn) => (
                                  <option key={leftColumn.id} value={leftColumn.id}>
                                    {getColumnTitle(leftColumn, inputMetric)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : isDeltaEligible(column.metric) ? (
                            <div className={styles.deltaPlaceholder}>Base column</div>
                          ) : (
                            <div className={styles.deltaPlaceholder}>Delta unavailable</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.rowInvalid ? styles.invalidRow : undefined}>
                      <td className={`${styles.cell} ${styles.timecodeCell}`}>
                        <div className={styles.timecodeText}>{row.value}</div>
                        {inputMetric === "milliseconds" && row.previewFormatted ? (
                          <div className={styles.inputPreview}>({row.previewFormatted})</div>
                        ) : null}
                        <div className={styles.lineMeta}>Line {row.lineNumber}</div>
                        {row.firstError ? <div className={styles.errorText}>{row.firstError}</div> : null}
                      </td>

                      {row.cells.map((cell) => {
                        if (!cell.conversion.ok) {
                          return (
                            <td key={cell.columnId} className={`${styles.cell} ${styles.invalidCell}`}>
                              <div className={styles.errorText}>{cell.conversion.error}</div>
                            </td>
                          );
                        }

                        const column = columns.find((candidate) => candidate.id === cell.columnId)!;
                        const referenceCell = column.deltaFromId
                          ? row.cells.find((candidate) => candidate.columnId === column.deltaFromId)
                          : null;

                        let deltaValue: number | null = null;
                        if (referenceCell && referenceCell.conversion.ok) {
                          if (column.metric === "frames") {
                            deltaValue =
                              cell.frameValue !== null && referenceCell.frameValue !== null
                                ? cell.frameValue - referenceCell.frameValue
                                : null;
                          } else {
                            deltaValue = cell.conversion.milliseconds - referenceCell.conversion.milliseconds;
                          }
                        }

                        return (
                          <td key={cell.columnId} className={styles.cell}>
                            {column.metric === "smpte" ? (
                              <div className={styles.primaryValue}>{cell.smpteLabel}</div>
                            ) : null}

                            {column.metric === "formattedTime" ? (
                              <>
                                <div className={styles.primaryValue}>{cell.conversion.formatted}</div>
                                <div className={styles.secondaryValue}>
                                  {cell.conversion.milliseconds.toLocaleString()} ms
                                </div>
                              </>
                            ) : null}

                            {column.metric === "milliseconds" ? (
                              <div className={styles.primaryValue}>
                                {cell.conversion.milliseconds.toLocaleString()} ms
                              </div>
                            ) : null}

                            {column.metric === "frames" ? (
                              <div className={styles.primaryValue}>
                                {cell.conversion.totalFrames.toLocaleString()} frames
                              </div>
                            ) : null}

                            {deltaValue !== null && column.metric === "formattedTime" ? (
                              <div className={styles.deltaValue}>{formatMillisecondDelta(deltaValue)}</div>
                            ) : null}

                            {deltaValue !== null && column.metric === "milliseconds" ? (
                              <div className={styles.deltaValue}>{formatMillisecondDelta(deltaValue)}</div>
                            ) : null}

                            {deltaValue !== null && column.metric === "frames" ? (
                              <div className={styles.deltaValue}>
                                {deltaValue > 0 ? "+" : deltaValue < 0 ? "-" : "±"}
                                {Math.abs(deltaValue).toLocaleString()} frames
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section id="how-it-works" className={styles.infoSection}>
        <div className={styles.infoSectionHeader}>
          <div className={styles.infoEyebrow}>Reference</div>
          <h2 className={styles.infoTitle}>How this SMPTE converter works</h2>
          <p className={styles.infoIntro}>
            The converter keeps label counting and real elapsed time separate. SMPTE labels are
            counted with the nominal integer frame rate, then converted to milliseconds with the
            exact playback-rate ratio.
          </p>
        </div>

        <div className={styles.howGrid}>
          <article className={styles.infoCard}>
            <h3 className={styles.faqQuestion}>Nominal fps vs real fps</h3>
            <p className={styles.faqAnswer}>
              SMPTE label counting uses nominal fps. Real elapsed time uses the exact playback
              rate. For example, 23.976 uses nominal 24, 29.97 uses nominal 30, and 59.94 uses
              nominal 60.
            </p>
          </article>

          <article className={styles.infoCard}>
            <h3 className={styles.faqQuestion}>Non-drop-frame count</h3>
            <p className={styles.faqAnswer}>
              For NDF labels, total frames are counted sequentially:
            </p>
            <code className={styles.formula}>
              Frames = ((HH × 3600 + MM × 60 + SS) × nominalFps) + FF
            </code>
          </article>

          <article className={styles.infoCard}>
            <h3 className={styles.faqQuestion}>Drop-frame count</h3>
            <p className={styles.faqAnswer}>
              For valid DF labels, skipped label numbers are subtracted from the nominal count:
            </p>
            <code className={styles.formula}>
              totalMinutes = HH × 60 + MM
              {"\n"}droppedFrameCount = dropFrames × (totalMinutes - floor(totalMinutes / 10))
              {"\n"}Frames = ((HH × 3600 + MM × 60 + SS) × nominalFps) + FF - droppedFrameCount
            </code>
          </article>

          <article className={styles.infoCard}>
            <h3 className={styles.faqQuestion}>Milliseconds conversion</h3>
            <p className={styles.faqAnswer}>
              Once total frames are known, real elapsed time is calculated with the exact rate:
            </p>
            <code className={styles.formula}>
              milliseconds = round((totalFrames × fpsDenominator × 1000) / fpsNumerator)
            </code>
          </article>

          <article className={styles.infoCard}>
            <h3 className={styles.faqQuestion}>Drop-frame validity</h3>
            <p className={styles.faqAnswer}>
              Drop-frame skips frame numbers, not actual video frames. At DF rates, skipped labels
              at the start of most minutes are invalid. Every 10th minute is treated differently,
              so labels are not skipped there.
            </p>
          </article>

          <article className={styles.infoCard}>
            <h3 className={styles.faqQuestion}>Compact example</h3>
            <p className={styles.faqAnswer}>
              At 29.97 DF, <code>01:00:00;00</code> has 60 total minutes. The converter subtracts
              108 dropped labels, so the total is 107,892 frames before converting to real
              milliseconds.
            </p>
          </article>
        </div>
      </section>

      <section id="faq" className={styles.infoSection}>
        <div className={styles.infoSectionHeader}>
          <div className={styles.infoEyebrow}>FAQ</div>
          <h2 className={styles.infoTitle}>SMPTE timecode questions</h2>
          <p className={styles.infoIntro}>
            Short answers for the common places where frame rates, DF/NDF modes, and elapsed time
            can feel counterintuitive.
          </p>
        </div>

        <div className={styles.inlineFaqList}>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className={styles.faqDetails}>
              <summary className={styles.faqSummary}>{item.question}</summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
