import { z } from "zod";
import { optionalText } from "./shared";

// Same blank-vs-missing preprocessing as optionalText, but for an enum
// instead of free text — "" (nothing picked) must map to undefined too, not
// fail enum validation.
const optionalGender = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.enum(["male", "female"]).optional(),
);

export const profileFormSchema = z.object({
  displayName: optionalText(60),
  avatarIcon: optionalText(4),
  birthDate: optionalText(10),
  gender: optionalGender,
});
