import type { Metadata } from "next";
import TaxDocumentChecklistClient from "./TaxDocumentChecklistClient";

export const metadata: Metadata = {
  title: "Tax Document Checklist (2026) | Event Clocks",
  description:
    "Generate a personalized tax document checklist and track which forms you’re still waiting for. Updated for the 2026 filing season (2025 income).",
  alternates: {
    canonical: "https://www.event-clocks.com/tax-document-checklist",
  },
};

export default function TaxDocumentChecklistPage() {
  return <TaxDocumentChecklistClient />;
}