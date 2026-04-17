import type { Metadata } from "next";
import WebAppSchema from "@/components/WebAppSchema";
import WeekNumberClient from "./WeekNumberClient";

const title = "Week Number Calculator";
const description =
  "Find the ISO week number, ISO week-year, day of year, quarter, and days left in the year for any date.";
const url = "https://www.event-clocks.com/week-number";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
};

export default function WeekNumberPage() {
  return (
    <>
      <WebAppSchema
        name={title}
        url={url}
        description={description}
        features={[
          "Calculate ISO week number",
          "Show ISO week-year",
          "Find day of year",
          "Show quarter and days left in year",
        ]}
      />
      <WeekNumberClient />
    </>
  );
}
