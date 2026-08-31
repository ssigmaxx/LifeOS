import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BarChart3,
  BookOpen,
  Calendar,
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

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// Grouped for the desktop sidebar — a flat 12-item list stops reading as a
// hierarchy, so related screens are clustered under a short section label
// instead. Settings is pinned separately, below the sections.
export const primaryNavSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/today", label: "Today", icon: Home },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/habits", label: "Habits", icon: ListChecks },
      { href: "/todos", label: "Todos", icon: ListTodo },
      { href: "/nutrition", label: "Nutrition", icon: Apple },
      { href: "/carbon", label: "Carbon", icon: Leaf },
      { href: "/budget", label: "Budget", icon: Wallet },
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/friends", label: "Friends", icon: Users },
    ],
  },
  {
    label: "Reflect",
    items: [
      { href: "/journal", label: "Journal", icon: BookOpen },
      { href: "/photos", label: "Photos", icon: Images },
      { href: "/ai-coach", label: "AI Coach", icon: Sparkles },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
];

export const settingsNavItem: NavItem = { href: "/settings", label: "Settings", icon: Settings };

// Mobile bottom nav shows only the highest-frequency screens; everything
// else lives behind "More" (see moreNav below).
export const mobileNav: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Home },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/photos", label: "Photos", icon: Images },
];

// Ordered to match the desktop grouping (Track, then Reflect, then Analyze).
export const moreNav: NavItem[] = [
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/todos", label: "Todos", icon: ListTodo },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/carbon", label: "Carbon", icon: Leaf },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];
