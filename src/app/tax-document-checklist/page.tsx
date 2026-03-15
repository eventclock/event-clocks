import type { Metadata } from "next";
import TaxDocumentChecklistClient from "./TaxDocumentChecklistClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Tax Document Checklist (2026 Filing Season)",
  description:
    "Generate a personalized tax document checklist and track which forms you’re still waiting for. Updated for the 2026 filing season (2025 income).",
  alternates: {
    canonical: "https://www.event-clocks.com/tax-document-checklist",
  },
};

export default function TaxDocumentChecklistPage() {
  return (
    <>
      <WebAppSchema
        name="Tax Document Checklist (2026 Filing Season)"
        url="https://www.event-clocks.com/tax-document-checklist"
        description="Generate a personalized tax document checklist and track which forms you’re still waiting for. Updated for the 2026 filing season (2025 income)."
        features={[
          "Generate a personalized tax form checklist based on your profile",
          "Track which tax documents are received or still missing",
          "Show typical availability windows for common tax forms",
          "Filter and search forms by status, number, issuer, or type",
          "Add private notes for follow-ups on each document",
          "Export and import your checklist as a backup"
        ]}
      />
      <TaxDocumentChecklistClient />
    </>
  );
}