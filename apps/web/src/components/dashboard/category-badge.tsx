import type { ReleaseCategory } from "@release-watch/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categoryStyles: Record<ReleaseCategory, string> = {
  major: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  minor:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  patch:
    "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
  security:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  breaking:
    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  unknown:
    "bg-slate-500/15 text-slate-500 dark:text-slate-500 border-slate-500/20",
};

interface CategoryBadgeProps {
  category: ReleaseCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <Badge variant="outline" className={cn(categoryStyles[category])}>
      {category}
    </Badge>
  );
}
