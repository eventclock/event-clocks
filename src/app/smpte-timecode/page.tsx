import type { Metadata } from "next";
import WebAppSchema from "@/components/WebAppSchema";
import SmpteTimecodeClient from "./SmpteTimecodeClient";

export const metadata: Metadata = {
  title: "Timecode Converter",
  description:
    "Convert timecode, frame counts, milliseconds, and real-time durations across multiple frame rates, including drop-frame formats.",
  alternates: {
    canonical: "https://www.event-clocks.com/smpte-timecode",
  },
};

export default function SmpteTimecodePage() {
  return (
    <>
      <WebAppSchema
        name="Timecode Converter"
        url="https://www.event-clocks.com/smpte-timecode"
        description="Convert timecode, frame counts, milliseconds, and real-time durations across multiple frame rates, including drop-frame formats."
        features={[
          "Convert multiple timecode values at once",
          "Compare results across multiple frame rates in one table",
          "Support both drop-frame and non-drop frame formats",
          "Show SMPTE labels, milliseconds, formatted time, frames, and optional deltas",
        ]}
      />
      <SmpteTimecodeClient />
    </>
  );
}
