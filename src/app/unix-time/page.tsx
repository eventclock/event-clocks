import type { Metadata } from "next";
import WebAppSchema from "@/components/WebAppSchema";
import UnixTimeClient from "./UnixTimeClient";

const title = "Unix Time Converter";
const description =
  "Convert Unix timestamps to readable dates and convert local date-times back to Unix seconds or milliseconds.";
const url = "https://www.event-clocks.com/unix-time";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
};

export default function UnixTimePage() {
  return (
    <>
      <WebAppSchema
        name={title}
        url={url}
        description={description}
        features={[
          "Convert Unix seconds to dates",
          "Convert Unix milliseconds to dates",
          "Convert local date-time values to Unix timestamps",
          "Show UTC and local formatted output",
        ]}
      />
      <UnixTimeClient />
    </>
  );
}
