import { z } from "zod";

export const travelModeSchema = z.enum(["car", "bus", "train", "flight", "bike_walk"]);

export const travelLogInputSchema = z.object({
  mode: travelModeSchema,
  distanceKm: z.coerce.number().positive("Distance must be greater than 0.").max(20000),
  occurredAt: z.string().optional(),
  note: z.string().max(200).optional(),
});

export type TravelLogInput = z.infer<typeof travelLogInputSchema>;

export const energyKindSchema = z.enum(["electricity", "gas"]);

export const energyLogInputSchema = z.object({
  kind: energyKindSchema,
  amount: z.coerce.number().positive("Amount must be greater than 0.").max(100000),
  occurredAt: z.string().optional(),
  note: z.string().max(200).optional(),
});

export type EnergyLogInput = z.infer<typeof energyLogInputSchema>;

export const purchaseCategorySchema = z.enum([
  "groceries",
  "dining_out",
  "clothing",
  "electronics",
  "transport",
  "housing",
  "entertainment",
  "health",
  "other",
]);

export const purchaseModeSchema = z.enum(["online", "offline"]);
export const purchaseConditionSchema = z.enum(["new", "secondhand"]);

export const purchaseLogInputSchema = z.object({
  category: purchaseCategorySchema,
  amount: z.coerce.number().positive("Amount must be greater than 0.").max(1000000),
  occurredAt: z.string().optional(),
  note: z.string().max(200).optional(),
  purchaseMode: purchaseModeSchema.optional(),
  condition: purchaseConditionSchema.optional(),
});

export type PurchaseLogInput = z.infer<typeof purchaseLogInputSchema>;
