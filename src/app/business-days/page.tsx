import type { Metadata } from "next";
import BusinessDaysClient from "./BusinessDaysClient";

export const metadata: Metadata = {
  title: "Business Day Calculator | Event Clocks",
  description:
    "Count working days between two dates or add business days, excluding weekends and country holidays.",
  alternates: {
    canonical: "https://www.event-clocks.com/business-days",
  },
};

export default function BusinessDaysPage() {
  return <BusinessDaysClient />;
}
