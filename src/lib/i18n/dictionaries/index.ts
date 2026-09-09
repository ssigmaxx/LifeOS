import "server-only";
import type { Locale } from "../locale";
import { en } from "./en";
import { de } from "./de";
import { hi } from "./hi";

const dictionaries = { en, de, hi };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export type { Dictionary } from "./en";
