import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BarChart3,
  BookOpen,
  Calendar,
  HeartPulse,
  Home,
  Images,
  Leaf,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Settings,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";

type NavLabelKey = keyof Dictionary["nav"];

export type NavItem = {
  href: string;
  /** English fallback — still used as-is by the command palette, which isn't translated yet. */
  label: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  labelKey: NavLabelKey;
  items: NavItem[];
};

// Grouped for the desktop sidebar — a flat 12-item list stops reading as a
// hierarchy, so related screens are clustered under a short section label
// instead. Settings is pinned separately, below the sections.
export const primaryNavSections: NavSection[] = [
  {
    label: "Overview",
    labelKey: "sectionOverview",
    items: [
      { href: "/", label: "Dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/today", label: "Today", labelKey: "today", icon: Home },
    ],
  },
  {
    label: "Track",
    labelKey: "sectionTrack",
    items: [
      { href: "/habits", label: "Habits", labelKey: "habits", icon: ListChecks },
      { href: "/todos", label: "Todos", labelKey: "todos", icon: ListTodo },
      { href: "/cycle", label: "Cycle", labelKey: "cycle", icon: HeartPulse },
      { href: "/nutrition", label: "Nutrition", labelKey: "nutrition", icon: Apple },
      { href: "/carbon", label: "Carbon", labelKey: "carbon", icon: Leaf },
      { href: "/budget", label: "Budget", labelKey: "budget", icon: Wallet },
      { href: "/goals", label: "Goals", labelKey: "goals", icon: Target },
      { href: "/friends", label: "Friends", labelKey: "friends", icon: Users },
    ],
  },
  {
    label: "Reflect",
    labelKey: "sectionReflect",
    items: [
      { href: "/journal", label: "Journal", labelKey: "journal", icon: BookOpen },
      { href: "/photos", label: "Photos", labelKey: "photos", icon: Images },
      { href: "/ai-coach", label: "AI Coach", labelKey: "aiCoach", icon: Sparkles },
    ],
  },
  {
    label: "Analyze",
    labelKey: "sectionAnalyze",
    items: [
      { href: "/analytics", label: "Analytics", labelKey: "analytics", icon: BarChart3 },
      { href: "/calendar", label: "Calendar", labelKey: "calendar", icon: Calendar },
    ],
  },
];

export const settingsNavItem: NavItem = {
  href: "/settings",
  label: "Settings",
  labelKey: "settings",
  icon: Settings,
};

// Mobile bottom nav shows only the highest-frequency screens; everything
// else lives behind "More" (see moreNav below).
export const mobileNav: NavItem[] = [
  { href: "/", label: "Home", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", labelKey: "today", icon: Home },
  { href: "/analytics", label: "Analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/photos", label: "Photos", labelKey: "photos", icon: Images },
];

// Ordered to match the desktop grouping (Track, then Reflect, then Analyze).
export const moreNav: NavItem[] = [
  { href: "/habits", label: "Habits", labelKey: "habits", icon: ListChecks },
  { href: "/todos", label: "Todos", labelKey: "todos", icon: ListTodo },
  { href: "/cycle", label: "Cycle", labelKey: "cycle", icon: HeartPulse },
  { href: "/nutrition", label: "Nutrition", labelKey: "nutrition", icon: Apple },
  { href: "/carbon", label: "Carbon", labelKey: "carbon", icon: Leaf },
  { href: "/budget", label: "Budget", labelKey: "budget", icon: Wallet },
  { href: "/goals", label: "Goals", labelKey: "goals", icon: Target },
  { href: "/friends", label: "Friends", labelKey: "friends", icon: Users },
  { href: "/journal", label: "Journal", labelKey: "journal", icon: BookOpen },
  { href: "/ai-coach", label: "AI Coach", labelKey: "aiCoach", icon: Sparkles },
  { href: "/calendar", label: "Calendar", labelKey: "calendar", icon: Calendar },
  { href: "/settings", label: "Settings", labelKey: "settings", icon: Settings },
];
