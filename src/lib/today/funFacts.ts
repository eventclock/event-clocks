import type { CountryCode } from "./types";

export const FUN_FACTS: Partial<Record<CountryCode, string>> = {
  US: "The United States spans six primary time zones including Hawaii and Alaska.",
  PH: "The Philippines is made up of more than 7,000 islands.",
  GB: "The United Kingdom uses Greenwich Mean Time as its winter civil time reference.",
  CA: "Canada has the longest coastline of any country.",
  AU: "Australia has three main time zones on the mainland.",
  NZ: "New Zealand is one of the first countries to greet each new calendar day.",
  SG: "Singapore uses one time zone year-round.",
  JP: "Japan Standard Time is UTC+9 all year.",
  IN: "India uses a single national time zone, India Standard Time.",
  DE: "Germany observes Central European Time and Central European Summer Time.",
  FR: "Metropolitan France uses Central European Time.",
  ES: "Spain has both mainland and Canary Islands time zones.",
  IT: "Italy observes Central European Time and Central European Summer Time.",
  BR: "Brazil has multiple time zones across its large east-west span.",
  MX: "Mexico has several official time zones across the country.",
};

export function getFunFact(countryCode: CountryCode) {
  return FUN_FACTS[countryCode] ?? null;
}
