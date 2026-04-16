import type { Metadata } from "next";
import { Suspense } from "react";
import WebAppSchema from "@/components/WebAppSchema";
import HolidayLongWeekendPlannerClient from "./HolidayLongWeekendPlannerClient";

const title = "Public Holiday & Long Weekend Planner by Country";
const description =
  "See upcoming public holidays, countdowns, long weekends, and bridge-day opportunities by country and year. Plan smarter time off with a simple holiday calendar.";
const url = "https://www.event-clocks.com/holiday-long-weekend-planner";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    type: "website",
    url,
    title,
    description,
    siteName: "Event Clocks",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function HolidayLongWeekendPlannerPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does the planner detect long weekends?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The planner marks holidays on Monday or Friday as long weekends. Holidays on Tuesday or Thursday are marked as potential four-day weekends because taking one bridge day may create a longer break.",
        },
      },
      {
        "@type": "Question",
        name: "Does this include all observed or regional holidays?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Holiday rules can vary by employer, region, and government calendar. This planner uses public holiday data by country and applies deterministic planning tags for quick holiday planning.",
        },
      },
      {
        "@type": "Question",
        name: "What is a bridge day?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A bridge day is a workday between a public holiday and a weekend. Taking that one day off may turn a normal break into a four-day weekend.",
        },
      },
    ],
  };

  return (
    <>
      <WebAppSchema
        name="Public Holiday & Long Weekend Planner"
        url={url}
        description={description}
        features={[
          "Show upcoming and past public holidays by country and year",
          "Calculate countdowns to upcoming holidays",
          "Flag Monday and Friday holidays as long weekends",
          "Flag Tuesday and Thursday holidays as bridge-day opportunities",
          "Highlight weekend and midweek holidays for planning",
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Suspense fallback={null}>
        <HolidayLongWeekendPlannerClient />
      </Suspense>
    </>
  );
}