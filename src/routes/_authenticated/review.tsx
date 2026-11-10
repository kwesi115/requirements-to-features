import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Flag, Paperclip, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader, Empty } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EntryLog, openEvidence } from "@/components/EntryLog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reasonRequired, type EntryStatus } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Review queue — Hourbook" }, { name: "description", content: "Verify submitted volunteer hours." }] }),
  component: Review,
});

function Review() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "flagged">("pending");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["review", tab],
    enabled: me?.role === "admin",
    queryFn: async () => {
      const { data: entries } = await supabase.from("volunteer_entries").select("*").eq("status", tab).order("created_at");
      const ids = [...new Set((entries ?? []).map((e) => e.student_id))];
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
      const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return (entries ?? []).map((e) => ({ ...e, student_name: names.get(e.student_id) || "Unnamed student" }));
    },
  });
  const entry = data.find((e) => e.id === selected) ?? data[0];

  async function decide(decision: EntryStatus) {
    if (!entry) return;
    if (reasonRequired(decision) && !reason.trim()) return toast.error("Write an explanation before rejecting or flagging.");
    setBusy(true);
    const { error } = await supabase.from("volunteer_entries").update({ status: decision, review_reason: reason.trim().slice(0, 1000) || null }).eq("id", entry.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(decision === "verified" ? "Entry verified" : decision === "rejected" ? "Entry rejected" : "Entry flagged");
    setReason(""); setSelected(null);
    qc.invalidateQueries({ queryKey: ["review"] });
    qc.invalidateQueries({ queryKey: ["log"] });
  }

  if (me && me.role !== "admin") return <Empty>Only admins can review submissions.</Empty>;

  return (
    <>
      <PageHeader title="Review queue" subtitle="Inspect each submission and its evidence, then approve, reject or flag it." />
      <Tabs value={tab} onValueChange={(v) => { setTab(v as "pending" | "flagged"); setSelected(null); }}>
        <TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="flagged">Flagged</TabsTrigger></TabsList>
      </Tabs>
      {data.length === 0 ? <div className="mt-6"><Empty>Nothing here. The queue is clear.</Empty></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <ul className="space-y-2">
            {data.map((e) => (
              <li key={e.id}>
                <button onClick={() => { setSelected(e.id); setReason(""); }} className={`w-full rounded-lg border p-4 text-left transition ${entry?.id === e.id ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/50"}`}>
                  <div className="font-semibold text-foreground">{e.student_name}</div>
                  <div className="text-sm text-muted-foreground">{e.organization} · {Number(e.hours)} hrs</div>
                  <div className="text-xs text-muted-foreground">Submitted {format(new Date(e.created_at), "MMM d")}</div>
                </button>
              </li>
            ))}
          </ul>
          {entry && (
            <section className="rounded-lg border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-semibold">{entry.student_name}</h2>
                <StatusBadge status={entry.status} />
              </div>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Organization</dt><dd className="font-medium">{entry.organization} ({entry.org_type})</dd></div>
                <div><dt className="text-muted-foreground">Role</dt><dd className="font-medium">{entry.role || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{format(new Date(entry.activity_date + "T00:00"), "MMMM d, yyyy")}</dd></div>
                <div><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{Number(entry.hours)} hours</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Activity</dt><dd>{entry.description}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Evidence</dt><dd>{entry.evidence_path ? <Button variant="outline" size="sm" onClick={() => openEvidence(entry.evidence_path!)}><Paperclip className="mr-1 h-4 w-4" /> Open attachment</Button> : <span className="text-warning-foreground">No evidence attached</span>}</dd></div>
              </dl>
              <div className="mt-6">
                <Label htmlFor="reason">Explanation <span className="text-muted-foreground">(required to reject or flag)</span></Label>
                <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="e.g. Please attach a supervisor sign-off." />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => decide("verified")} className="bg-success text-success-foreground hover:bg-success/90"><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>
                <Button disabled={busy} variant="destructive" onClick={() => decide("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                {entry.status !== "flagged" && <Button disabled={busy} variant="outline" onClick={() => decide("flagged")}><Flag className="mr-1 h-4 w-4" /> Flag</Button>}
              </div>
              <div className="mt-8"><h3 className="mb-3 text-lg font-semibold">History</h3><EntryLog entryId={entry.id} /></div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
