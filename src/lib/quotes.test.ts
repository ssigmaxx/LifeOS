import { describe, expect, it } from "vitest";
import { getRandomQuote, MOTIVATIONAL_QUOTES } from "./quotes";

describe("MOTIVATIONAL_QUOTES", () => {
  it("has a large enough pool that repeats are rare", () => {
    expect(MOTIVATIONAL_QUOTES.length).toBeGreaterThanOrEqual(20);
  });

  it("every quote has non-empty text and author", () => {
    for (const quote of MOTIVATIONAL_QUOTES) {
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });
});

describe("getRandomQuote", () => {
  it("always returns a quote from the pool", () => {
    for (let i = 0; i < 50; i++) {
      expect(MOTIVATIONAL_QUOTES).toContainEqual(getRandomQuote());
    }
  });

  it("returns more than one distinct quote across many calls", () => {
    const seen = new Set(Array.from({ length: 50 }, () => getRandomQuote().text));
    expect(seen.size).toBeGreaterThan(1);
  });
});
