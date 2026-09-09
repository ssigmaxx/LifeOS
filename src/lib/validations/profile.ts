import { z } from "zod";
import { optionalText } from "./shared";

export const profileFormSchema = z.object({
  displayName: optionalText(60),
  avatarIcon: optionalText(4),
  birthDate: optionalText(10),
});
