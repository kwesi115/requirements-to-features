import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Paperclip, Pencil, Plus, Trash2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader, Stat, Empty } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EntryForm } from "@/components/EntryForm";
import { EntryLog, openEvidence } from "@/components/EntryLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canStudentEdit, loggedTotal, STATUS_LABELS, verifiedTotal, type EntryStatus } from "@/lib/roles";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/hours")({
  head: () => ({ meta: [{ title: "My hours — Hourbook" }, { name: "description", content: "Log and track your volunteer hours." }] }),
  component: Hours,
});

type Entry = Tables<"volunteer_entries">;

function Hours() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [history, setHistory] = useState<Entry | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [org, setOrg] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["entries", "mine"],
    queryFn: async () => (await supabase.from("volunteer_entries").select("*").order("activity_date", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => entries.filter((e) =>
    (status === "all" || e.status === status) &&
    (!org || e.organization.toLowerCase().includes(org.toLowerCase())) &&
    (!from || e.activity_date >= from) && (!to || e.activity_date <= to)
  ), [entries, status, org, from, to]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["entries"] }); qc.invalidateQueries({ queryKey: ["overview"] }); };

  async function remove(e: Entry) {
    const { error } = await supabase.from("volunteer_entries").delete().eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    if (e.evidence_path) await supabase.storage.from("evidence").remove([e.evidence_path]);
    toast.success("Entry removed");
    setDeleting(null);
    refresh();
  }

  if (me && me.role !== "student") return <Empty>Only students log volunteer hours.</Empty>;

  return (
    <>
      <PageHeader title="My volunteer hours" subtitle="Submit hours with evidence; an admin verifies each entry." action={<Button onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> Log hours</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Verified hours" value={verifiedTotal(entries as never)} />
        <Stat label="Logged hours" value={loggedTotal(entries as never)} hint="All submitted entries" />
        <Stat label="Showing" value={`${filtered.length} / ${entries.length}`} hint="entries after filters" />
      </div>

      <div className="mt-8 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <div><Label>Status</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{(Object.keys(STATUS_LABELS) as EntryStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select></div>
        <div><Label htmlFor="f-org">Organization</Label><Input id="f-org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Search" /></div>
        <div><Label htmlFor="f-from">From</Label><Input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="f-to">To</Label><Input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? <Empty>No entries match. Log your first hours to get started.</Empty> : filtered.map((e) => (
          <article key={e.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{e.organization}</h3>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{format(new Date(e.activity_date + "T00:00"), "MMM d, yyyy")} · {Number(e.hours)} hrs{e.role && ` · ${e.role}`} · {e.org_type}</div>
                <p className="mt-2 text-sm text-foreground">{e.description}</p>
                {e.review_reason && e.status !== "verified" && <p className="mt-2 rounded bg-muted p-2 text-sm"><span className="font-semibold">Reviewer:</span> {e.review_reason}</p>}
              </div>
              <div className="flex gap-1">
                {e.evidence_path && <Button size="icon" variant="ghost" aria-label="View evidence" onClick={() => openEvidence(e.evidence_path!)}><Paperclip className="h-4 w-4" /></Button>}
                <Button size="icon" variant="ghost" aria-label="History" onClick={() => setHistory(e)}><History className="h-4 w-4" /></Button>
                {canStudentEdit(e.status) && <>
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeleting(e)}><Trash2 className="h-4 w-4" /></Button>
                </>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing === "new" ? "Log volunteer hours" : editing?.status === "draft" ? "Complete draft" : "Edit entry"}</DialogTitle></DialogHeader>
          {editing && me && <EntryForm entry={editing === "new" ? undefined : editing} userId={me.user.id} onDone={() => { setEditing(null); refresh(); }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent><DialogHeader><DialogTitle>Entry history</DialogTitle></DialogHeader>{history && <EntryLog entryId={history.id} />}</DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove this entry?</AlertDialogTitle><AlertDialogDescription>This permanently deletes the entry and its evidence.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleting && remove(deleting)}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
