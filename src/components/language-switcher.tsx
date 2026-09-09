"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { setLocaleAction } from "@/lib/i18n/actions";

export function LanguageSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={locale}
      disabled={isPending}
      onValueChange={(next) => {
        if (!next || next === locale) return;
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        });
      }}
    >
      <SelectTrigger className={className} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span aria-hidden="true">{l.flag}</span> {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
