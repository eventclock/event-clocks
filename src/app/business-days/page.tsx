import type { Metadata } from "next";
import BusinessDaysClient from "./BusinessDaysClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Business Day Calculator",
  description:
    "Count working days between two dates or add business days, excluding weekends and country holidays.",
  alternates: {
    canonical: "https://www.event-clocks.com/business-days",
  },
};

export default function BusinessDaysPage() {
  return (
    <>
      <WebAppSchema
        name="Business Day Calculator"
        url="https://www.event-clocks.com/business-days"
        description="Count working days between two dates or add business days, excluding weekends and country holidays."
        features={[
          "Calculate working days between two dates",
          "Add business days to a starting date",
          "Exclude weekends from calculations",
          "Automatically exclude public holidays by country",
          "Show skipped weekends and holidays in the results"
        ]}
      />
      <BusinessDaysClient />
    </>
  );
}
