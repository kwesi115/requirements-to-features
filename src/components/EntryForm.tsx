import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORG_TYPES } from "@/lib/roles";
import type { Tables } from "@/integrations/supabase/types";

export const entrySchema = z.object({
  organization: z.string().trim().min(1, "Organization is required").max(150),
  org_type: z.string().min(1),
  role: z.string().trim().max(120),
  activity_date: z.string().min(1, "Date is required").refine((d) => d <= format(new Date(), "yyyy-MM-dd"), "Date cannot be in the future"),
  hours: z.coerce.number({ invalid_type_error: "Duration is required" }).gt(0, "Duration must be more than 0").max(24, "At most 24 hours per entry"),
  description: z.string().trim().min(1, "Activity description is required").max(2000),
});

const ACCEPT = "image/*,application/pdf";

export function EntryForm({ entry, userId, onDone }: { entry?: Tables<"volunteer_entries">; userId: string; onDone: () => void }) {
  const [orgType, setOrgType] = useState(entry?.org_type ?? "Nonprofit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>, status: "pending" | "draft") {
    e.preventDefault();
    const form = (e.currentTarget.closest("form") ?? e.currentTarget) as HTMLFormElement;
    const f = new FormData(form);
    const parsed = entrySchema.safeParse({
      organization: f.get("organization"),
      org_type: orgType,
      role: f.get("role") ?? "",
      activity_date: f.get("activity_date"),
      hours: f.get("hours"),
      description: f.get("description"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    let evidence_path = entry?.evidence_path ?? null;
    const file = f.get("evidence") as File | null;
    if (file && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) { setBusy(false); return toast.error("Evidence must be under 10 MB"); }
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("evidence").upload(path, file);
      if (error) { setBusy(false); return toast.error("Upload failed: " + error.message); }
      evidence_path = path;
    }
    const payload = { ...parsed.data, evidence_path, status };
    const { error } = entry
      ? await supabase.from("volunteer_entries").update(payload).eq("id", entry.id)
      : await supabase.from("volunteer_entries").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(status === "pending" ? "Submitted — Pending Verification" : "Draft saved");
    onDone();
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={(e) => save(e, "pending")} className="space-y-4" noValidate>
      {entry?.review_reason && (entry.status === "rejected" || entry.status === "flagged") && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <span className="font-semibold">Reviewer note:</span> {entry.review_reason}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="organization">Organization *</Label><Input id="organization" name="organization" defaultValue={entry?.organization} maxLength={150} />{err("organization")}</div>
        <div>
          <Label>Organization type</Label>
          <Select value={orgType} onValueChange={setOrgType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ORG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="role">Your role</Label><Input id="role" name="role" defaultValue={entry?.role} placeholder="e.g. Tutor" maxLength={120} /></div>
        <div><Label htmlFor="activity_date">Date *</Label><Input id="activity_date" name="activity_date" type="date" max={format(new Date(), "yyyy-MM-dd")} defaultValue={entry?.activity_date} />{err("activity_date")}</div>
        <div><Label htmlFor="hours">Duration (hours) *</Label><Input id="hours" name="hours" type="number" step="0.25" min="0.25" max="24" defaultValue={entry?.hours} />{err("hours")}</div>
        <div className="sm:col-span-2"><Label htmlFor="description">Activity description *</Label><Textarea id="description" name="description" rows={3} defaultValue={entry?.description} maxLength={2000} />{err("description")}</div>
        <div className="sm:col-span-2">
          <Label htmlFor="evidence">Supporting evidence (photo or supervisor sign-off)</Label>
          <Input id="evidence" name="evidence" type="file" accept={ACCEPT} />
          {entry?.evidence_path && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="h-3 w-3" /> Evidence attached — upload a new file to replace it.</p>}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" disabled={busy} onClick={(e) => save(e as unknown as React.FormEvent<HTMLFormElement>, "draft")}>Save draft</Button>
        <Button type="submit" disabled={busy}>{entry && entry.status !== "draft" && entry.status !== "pending" ? "Resubmit for verification" : "Submit for verification"}</Button>
      </div>
    </form>
  );
}
