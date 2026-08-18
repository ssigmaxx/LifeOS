import { z } from "zod";

// formData.get() returns "" for a blank input and null for a missing one —
// neither should trip an .optional() field, which only accepts undefined.
export const optionalText = (max: number) =>
  z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.string().max(max).optional(),
  );

export const moodSchema = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.coerce.number().int().min(1).max(5).optional(),
);
