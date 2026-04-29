import type { Metadata } from "next";
import ColorMatchAppClient from "./ColorMatchAppClient";

export const metadata: Metadata = {
  title: "Fashion Color Match",
  description:
    "Compare two photos or two colors and get a quick read on whether the pairing works.",
};

export default function ColorMatchAppPage() {
  return <ColorMatchAppClient />;
}
