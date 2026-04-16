export type FrameRateKey =
  | "23.976"
  | "24"
  | "25"
  | "29.97 NDF"
  | "29.97 DF"
  | "30"
  | "47.952"
  | "48"
  | "50"
  | "59.94 NDF"
  | "59.94 DF"
  | "60"
  | "100"
  | "119.88"
  | "120";

export type FrameRateOption = {
  key: FrameRateKey;
  label: string;
  fpsNumerator: number;
  fpsDenominator: number;
  nominalFps: number;
  dropFrames: number;
  isDropFrame: boolean;
};

export type ParsedSmpteTimecode = {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
  separator: ":" | ";";
};

export type TimecodeParseResult =
  | {
      ok: true;
      value: ParsedSmpteTimecode;
    }
  | {
      ok: false;
      error: string;
    };

export type SmpteConversionResult =
  | {
      ok: true;
      totalFrames: number;
      milliseconds: number;
      formatted: string;
      parsed: ParsedSmpteTimecode;
      interpretedSeparator: ":" | ";";
      interpretationApplied: boolean;
    }
  | {
      ok: false;
      error: string;
      errorCode: "invalid_format" | "frame_out_of_range" | "invalid_df";
      interpretedSeparator?: ":" | ";";
      interpretationApplied?: boolean;
    };

export const FRAME_RATE_OPTIONS: FrameRateOption[] = [
  {
    key: "23.976",
    label: "23.976",
    fpsNumerator: 24000,
    fpsDenominator: 1001,
    nominalFps: 24,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "24",
    label: "24",
    fpsNumerator: 24,
    fpsDenominator: 1,
    nominalFps: 24,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "25",
    label: "25",
    fpsNumerator: 25,
    fpsDenominator: 1,
    nominalFps: 25,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "29.97 NDF",
    label: "29.97 NDF",
    fpsNumerator: 30000,
    fpsDenominator: 1001,
    nominalFps: 30,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "29.97 DF",
    label: "29.97 DF",
    fpsNumerator: 30000,
    fpsDenominator: 1001,
    nominalFps: 30,
    dropFrames: 2,
    isDropFrame: true,
  },
  {
    key: "30",
    label: "30",
    fpsNumerator: 30,
    fpsDenominator: 1,
    nominalFps: 30,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "47.952",
    label: "47.952",
    fpsNumerator: 48000,
    fpsDenominator: 1001,
    nominalFps: 48,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "48",
    label: "48",
    fpsNumerator: 48,
    fpsDenominator: 1,
    nominalFps: 48,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "50",
    label: "50",
    fpsNumerator: 50,
    fpsDenominator: 1,
    nominalFps: 50,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "59.94 NDF",
    label: "59.94 NDF",
    fpsNumerator: 60000,
    fpsDenominator: 1001,
    nominalFps: 60,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "59.94 DF",
    label: "59.94 DF",
    fpsNumerator: 60000,
    fpsDenominator: 1001,
    nominalFps: 60,
    dropFrames: 4,
    isDropFrame: true,
  },
  {
    key: "60",
    label: "60",
    fpsNumerator: 60,
    fpsDenominator: 1,
    nominalFps: 60,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "100",
    label: "100",
    fpsNumerator: 100,
    fpsDenominator: 1,
    nominalFps: 100,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "119.88",
    label: "119.88",
    fpsNumerator: 120000,
    fpsDenominator: 1001,
    nominalFps: 120,
    dropFrames: 0,
    isDropFrame: false,
  },
  {
    key: "120",
    label: "120",
    fpsNumerator: 120,
    fpsDenominator: 1,
    nominalFps: 120,
    dropFrames: 0,
    isDropFrame: false,
  },
];

const FRAME_RATE_BY_KEY = new Map(FRAME_RATE_OPTIONS.map((option) => [option.key, option]));
const SMPTE_RE = /^(\d{2}):([0-5]\d):([0-5]\d)([:;])(\d{2})$/;

export function getFrameRateOption(key: FrameRateKey): FrameRateOption {
  const option = FRAME_RATE_BY_KEY.get(key);
  if (!option) {
    throw new Error(`Unsupported frame rate: ${key}`);
  }
  return option;
}

export function parseSmpteTimecode(input: string): TimecodeParseResult {
  const trimmed = input.trim();
  const match = SMPTE_RE.exec(trimmed);

  if (!match) {
    return {
      ok: false,
      error: "Use HH:MM:SS:FF or HH:MM:SS;FF.",
    };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const separator = match[4] as ":" | ";";
  const frames = Number(match[5]);

  return {
    ok: true,
    value: {
      hours,
      minutes,
      seconds,
      frames,
      separator,
    },
  };
}

export function countFramesNonDrop(
  timecode: ParsedSmpteTimecode,
  nominalFps: number
): number {
  const totalSeconds = timecode.hours * 3600 + timecode.minutes * 60 + timecode.seconds;
  return totalSeconds * nominalFps + timecode.frames;
}

export function countFramesDropFrame(
  timecode: ParsedSmpteTimecode,
  nominalFps: number,
  dropFrames: number
): number {
  const totalMinutes = timecode.hours * 60 + timecode.minutes;
  const droppedFrameCount = dropFrames * (totalMinutes - Math.floor(totalMinutes / 10));
  const totalSeconds = timecode.hours * 3600 + timecode.minutes * 60 + timecode.seconds;

  return totalSeconds * nominalFps + timecode.frames - droppedFrameCount;
}

export function convertTotalFramesToMilliseconds(
  totalFrames: number,
  fpsNumerator: number,
  fpsDenominator: number
): number {
  return Math.round((totalFrames * fpsDenominator * 1000) / fpsNumerator);
}

export function formatMilliseconds(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  const millis = abs % 1000;

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatTotalFramesAsSmpte(totalFrames: number, frameRateKey: FrameRateKey): string {
  const option = getFrameRateOption(frameRateKey);

  if (!option.isDropFrame) {
    const framesPerHour = option.nominalFps * 3600;
    const framesPerMinute = option.nominalFps * 60;
    const hours = Math.floor(totalFrames / framesPerHour);
    const hourRemainder = totalFrames % framesPerHour;
    const minutes = Math.floor(hourRemainder / framesPerMinute);
    const minuteRemainder = hourRemainder % framesPerMinute;
    const seconds = Math.floor(minuteRemainder / option.nominalFps);
    const frames = minuteRemainder % option.nominalFps;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  }

  const framesPerHour = option.nominalFps * 3600 - option.dropFrames * 54;
  const framesPer24Hours = framesPerHour * 24;
  const framesPer10Minutes = option.nominalFps * 600 - option.dropFrames * 9;
  const framesPerMinute = option.nominalFps * 60 - option.dropFrames;

  const wholeDays = Math.floor(totalFrames / framesPer24Hours);
  const framesIntoDay = totalFrames % framesPer24Hours;
  const tenMinuteBlocks = Math.floor(framesIntoDay / framesPer10Minutes);
  const framesIntoTenMinuteBlock = framesIntoDay % framesPer10Minutes;

  let frameNumber = framesIntoDay + option.dropFrames * 9 * tenMinuteBlocks;

  if (framesIntoTenMinuteBlock >= option.dropFrames) {
    frameNumber =
      frameNumber +
      option.dropFrames * Math.floor((framesIntoTenMinuteBlock - option.dropFrames) / framesPerMinute);
  }

  const totalHours = wholeDays * 24 + Math.floor(frameNumber / (option.nominalFps * 3600));
  const hourRemainder = frameNumber % (option.nominalFps * 3600);
  const minutes = Math.floor(hourRemainder / (option.nominalFps * 60));
  const minuteRemainder = hourRemainder % (option.nominalFps * 60);
  const seconds = Math.floor(minuteRemainder / option.nominalFps);
  const frames = minuteRemainder % option.nominalFps;

  return `${String(totalHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")};${String(frames).padStart(2, "0")}`;
}

export function countLabelFramesFromSmpte(label: string, frameRateKey: FrameRateKey): number | null {
  const parsed = parseSmpteTimecode(label);
  if (!parsed.ok) return null;

  const option = getFrameRateOption(frameRateKey);
  return option.isDropFrame
    ? countFramesDropFrame(parsed.value, option.nominalFps, option.dropFrames)
    : countFramesNonDrop(parsed.value, option.nominalFps);
}

export function countLabelIndexFromSmpte(label: string, frameRateKey: FrameRateKey): number | null {
  const parsed = parseSmpteTimecode(label);
  if (!parsed.ok) return null;

  const option = getFrameRateOption(frameRateKey);
  const { hours, minutes, seconds, frames } = parsed.value;
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  return totalSeconds * option.nominalFps + frames;
}

export function convertSmpteToRealMilliseconds(
  input: string,
  frameRateKey: FrameRateKey
): SmpteConversionResult {
  const parsed = parseSmpteTimecode(input);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      errorCode: "invalid_format",
    };
  }

  const option = getFrameRateOption(frameRateKey);
  const interpretedSeparator: ParsedSmpteTimecode["separator"] = option.isDropFrame ? ";" : ":";
  const value: ParsedSmpteTimecode = {
    ...parsed.value,
    separator: interpretedSeparator,
  };
  const interpretationApplied = parsed.value.separator !== interpretedSeparator;

  if (value.frames >= option.nominalFps) {
    return {
      ok: false,
      error: `Frame number must be below ${option.nominalFps} for ${option.label}.`,
      errorCode: "frame_out_of_range",
      interpretedSeparator,
      interpretationApplied,
    };
  }

  if (option.isDropFrame) {
    const isDropMinute = value.minutes % 10 !== 0;
    const isDroppedLabel = isDropMinute && value.seconds === 0 && value.frames < option.dropFrames;

    if (isDroppedLabel) {
      return {
        ok: false,
        error: "Invalid DF",
        errorCode: "invalid_df",
        interpretedSeparator,
        interpretationApplied,
      };
    }

    const totalFrames = countFramesDropFrame(value, option.nominalFps, option.dropFrames);
    const milliseconds = convertTotalFramesToMilliseconds(
      totalFrames,
      option.fpsNumerator,
      option.fpsDenominator
    );

    return {
      ok: true,
      totalFrames,
      milliseconds,
      formatted: formatMilliseconds(milliseconds),
      parsed: value,
      interpretedSeparator,
      interpretationApplied,
    };
  }

  const totalFrames = countFramesNonDrop(value, option.nominalFps);
  const milliseconds = convertTotalFramesToMilliseconds(
    totalFrames,
    option.fpsNumerator,
    option.fpsDenominator
  );

  return {
    ok: true,
    totalFrames,
    milliseconds,
    formatted: formatMilliseconds(milliseconds),
    parsed: value,
    interpretedSeparator,
    interpretationApplied,
  };
}
