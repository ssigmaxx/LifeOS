import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder="Search journal entries…"
        className="pl-8"
      />
    </form>
  );
}
