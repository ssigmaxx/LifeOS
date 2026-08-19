import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BarChart3,
  BookOpen,
  Calendar,
  Home,
  Images,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Full set, used by the desktop sidebar.
export const primaryNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Home },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/photos", label: "Photos", icon: Images },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom nav shows only the highest-frequency screens; everything
// else lives behind "More" (see moreNav below).
export const mobileNav: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Home },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/photos", label: "Photos", icon: Images },
];

export const moreNav: NavItem[] = [
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];
