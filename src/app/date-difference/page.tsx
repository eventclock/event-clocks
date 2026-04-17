import type { Metadata } from "next";
import WebAppSchema from "@/components/WebAppSchema";
import DateDifferenceClient from "./DateDifferenceClient";

const title = "Date Difference Calculator";
const description =
  "Count calendar days, weeks, and inclusive days between two dates with a simple deterministic date calculator.";
const url = "https://www.event-clocks.com/date-difference";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
};

export default function DateDifferencePage() {
  return (
    <>
      <WebAppSchema
        name={title}
        url={url}
        description={description}
        features={[
          "Count days between two dates",
          "Show absolute and signed day differences",
          "Calculate inclusive day counts",
          "Break date differences into weeks and days",
        ]}
      />
      <DateDifferenceClient />
    </>
  );
}
