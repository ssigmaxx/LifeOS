"use server";

import { getDayDetail, type DayDetail } from "@/lib/services/analytics-service";

export async function getDayDetailAction(date: string): Promise<DayDetail> {
  return getDayDetail(date);
}
