import "server-only";
import { timingSafeEqual } from "node:crypto";

// A plain `!==` comparison on a bearer token is a (practically very hard to
// exploit, but textbook-incorrect) timing side channel — response latency
// could in principle leak how many leading bytes matched. Comparing
// equal-length buffers with timingSafeEqual closes that off properly.
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);

  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
