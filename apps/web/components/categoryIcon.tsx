import {
  Mail,
  Receipt,
  FileText,
  CalendarClock,
  Briefcase,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { TaskCategory } from "@clutch/core";

export const CATEGORY_ICON: Record<TaskCategory, LucideIcon> = {
  assignment: FileText,
  email: Mail,
  bill: Receipt,
  interview: Briefcase,
  meeting: CalendarClock,
  errand: ListChecks,
  other: ListChecks,
};
