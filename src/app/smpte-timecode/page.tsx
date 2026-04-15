import type { Metadata } from "next";
import WebAppSchema from "@/components/WebAppSchema";
import SmpteTimecodeClient from "./SmpteTimecodeClient";

export const metadata: Metadata = {
  title: "SMPTE Timecode to Milliseconds",
  description:
    "Convert SMPTE timecode values to real-time milliseconds across multiple frame rates, including drop-frame formats.",
  alternates: {
    canonical: "https://www.event-clocks.com/smpte-timecode",
  },
};

export default function SmpteTimecodePage() {
  return (
    <>
      <WebAppSchema
        name="SMPTE Timecode to Milliseconds"
        url="https://www.event-clocks.com/smpte-timecode"
        description="Convert SMPTE timecode values to real-time milliseconds across multiple frame rates, including drop-frame formats."
        features={[
          "Convert multiple SMPTE timecodes at once",
          "Compare results across multiple frame rates in one table",
          "Support both drop-frame and non-drop frame formats",
          "Show real milliseconds, formatted time, and optional deltas",
        ]}
      />
      <SmpteTimecodeClient />
    </>
  );
}
