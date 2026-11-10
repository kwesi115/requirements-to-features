import { CheckCircle2, Clock, Flag, XCircle, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type EntryStatus } from "@/lib/roles";

const styles: Record<EntryStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/15 text-foreground border-warning/50",
  verified: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/10 text-destructive border-destructive/40",
  flagged: "bg-info/10 text-info border-info/40",
};
const icons = { draft: FileEdit, pending: Clock, verified: CheckCircle2, rejected: XCircle, flagged: Flag };

export function StatusBadge({ status, className }: { status: EntryStatus; className?: string }) {
  const Icon = icons[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles[status], className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
