import type { Metadata } from "next";
import FocusWindowClient from "./FocusWindowClient";

export const metadata: Metadata = {
  title: "Focus Countdown — Event Clocks",
  description: "Detached focus countdown window for a single task.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CountdownTasksFocusPage() {
  return <FocusWindowClient />;
}