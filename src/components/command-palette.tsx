"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search, Droplets, Wind, Dumbbell, ListPlus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { primaryNavSections, settingsNavItem } from "@/lib/nav";
import { addWaterLogAction, logMeditationAction, logWorkoutQuickAction } from "@/app/(app)/today/actions";
import { quickCreateTodoAction } from "@/app/(app)/todos/actions";

type PaletteGroup = "Quick actions" | "Jump to" | "Create";

type PaletteItem = {
  id: string;
  group: PaletteGroup;
  label: string;
  icon: LucideIcon;
  run: () => void;
};

function fireAction(promise: Promise<void>, successMessage: string) {
  promise
    .then(() => toast.success(successMessage))
    .catch((err) => toast.error(err instanceof Error ? err.message : "Something went wrong."));
}

// ---------- context: one open/close state shared by every trigger ----------
//
// query/activeIndex live here too (not in the dialog itself) so opening can
// reset them from a plain event handler — the keyboard shortcut and every
// trigger button — instead of an effect reacting to `open`, which would mean
// calling setState synchronously inside an effect body.

type CommandPaletteContextValue = { open: boolean; openPalette: () => void; closePalette: () => void };
const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  function openPalette() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }
  function closePalette() {
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <CommandPaletteContext.Provider value={{ open, openPalette, closePalette }}>
      {children}
      <CommandPaletteDialog
        open={open}
        onOpenChange={(next) => (next ? openPalette() : closePalette())}
        query={query}
        setQuery={setQuery}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    </CommandPaletteContext.Provider>
  );
}

// ---------- trigger button ----------

export function CommandPaletteTrigger({
  variant = "full",
  className,
}: {
  variant?: "full" | "icon";
  className?: string;
}) {
  const { openPalette } = useCommandPalette();

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={openPalette}
        aria-label="Quick add or jump to"
        className={cn(
          "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <Search className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Quick add or jump to…</span>
      <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

// ---------- the dialog itself ----------

function CommandPaletteDialog({
  open,
  onOpenChange,
  query,
  setQuery,
  activeIndex,
  setActiveIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo<PaletteItem[]>(() => {
    const items = primaryNavSections.flatMap((section) => section.items);
    return [...items, settingsNavItem].map((item) => ({
      id: `nav-${item.href}`,
      group: "Jump to" as const,
      label: item.label,
      icon: item.icon,
      run: () => router.push(item.href),
    }));
  }, [router]);

  const quickActionItems = useMemo<PaletteItem[]>(
    () => [
      {
        id: "quick-water",
        group: "Quick actions",
        label: "Log water +250ml",
        icon: Droplets,
        run: () => fireAction(addWaterLogAction(250), "Logged 250ml of water"),
      },
      {
        id: "quick-meditation",
        group: "Quick actions",
        label: "Meditate 10 min",
        icon: Wind,
        run: () => fireAction(logMeditationAction(10), "Logged a 10 minute meditation session"),
      },
      {
        id: "quick-workout",
        group: "Quick actions",
        label: "Mark workout done today",
        icon: Dumbbell,
        run: () => fireAction(logWorkoutQuickAction(), "Marked today's workout done"),
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    const q = trimmed.toLowerCase();
    const base = [...quickActionItems, ...navItems];
    const matches = q === "" ? base : base.filter((item) => item.label.toLowerCase().includes(q));

    if (trimmed !== "" && trimmed.length <= 200) {
      const createItem: PaletteItem = {
        id: "create-todo",
        group: "Create",
        label: `Add "${trimmed}" as a todo`,
        icon: ListPlus,
        run: () => {
          quickCreateTodoAction(trimmed).then((res) => {
            if (res.error) toast.error(res.error);
            else toast.success(`Added "${trimmed}" to your todos`);
          });
        },
      };
      return [...matches, createItem];
    }

    return matches;
  }, [query, quickActionItems, navItems]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelectorAll("[data-item]")[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  function select(index: number) {
    const item = filtered[index];
    if (!item) return;
    onOpenChange(false);
    item.run();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(activeIndex);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  let lastGroup: PaletteGroup | null = null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-[16%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div className="flex items-center gap-2.5 border-b px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Log water, jump to Budget…"
              autoComplete="off"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches</p>
            ) : (
              filtered.map((item, i) => {
                const showGroupLabel = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {showGroupLabel ? (
                      <p className="px-2.5 pt-2.5 pb-1 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
                        {item.group}
                      </p>
                    ) : null}
                    <div
                      data-item
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => select(i)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                        i === activeIndex ? "bg-accent text-accent-foreground" : undefined,
                      )}
                    >
                      <item.icon className={cn("size-4 shrink-0", i === activeIndex ? undefined : "text-muted-foreground")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {i === activeIndex ? <kbd className="shrink-0 text-[10.5px] text-muted-foreground">↵</kbd> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
