"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CategoryJump({ categories }: { categories: { id: string; name: string }[] }) {
  const [value, setValue] = useState("");

  if (categories.length < 2) return null;

  function jumpTo(id: string) {
    const target = document.getElementById(`category-${id}`);
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (!v) return;
        jumpTo(v);
        setValue("");
      }}
    >
      <SelectTrigger className="w-full sm:w-52">
        <SelectValue placeholder="Jump to category…" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
