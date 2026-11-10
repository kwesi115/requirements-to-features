import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader, Empty } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORG_TYPES } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover students — Hourbook" }, { name: "description", content: "Find students with verified volunteer experience." }] }),
  component: Discover,
});

function Discover() {
  const { data: me } = useMe();
  const [minHours, setMinHours] = useState("0");
  const [cause, setCause] = useState("");
  const [skill, setSkill] = useState("");
  const [orgType, setOrgType] = useState("any");
  const { data = [], isFetching } = useQuery({
    queryKey: ["discover", minHours, cause, skill, orgType],
    enabled: me?.role === "recruiter" || me?.role === "admin",
    queryFn: async () => {
      const args: { _min_hours: number; _cause?: string; _skill?: string; _org_type?: string } = { _min_hours: Math.max(0, Number(minHours) || 0) };
      if (cause.trim()) args._cause = cause.trim();
      if (skill.trim()) args._skill = skill.trim();
      if (orgType !== "any") args._org_type = orgType;
      return (await supabase.rpc("search_students", args)).data ?? [];
    },
  });
  if (me && me.role !== "recruiter" && me.role !== "admin") return <Empty>Only recruiters can discover students.</Empty>;
  return (
    <>
      <PageHeader title="Discover students" subtitle="Only students who opted in appear here, and only verified hours count." />
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <div><Label htmlFor="min">Min. verified hours</Label><Input id="min" type="number" min="0" value={minHours} onChange={(e) => setMinHours(e.target.value)} /></div>
        <div><Label htmlFor="cause">Cause</Label><Input id="cause" value={cause} onChange={(e) => setCause(e.target.value)} placeholder="e.g. Education" /></div>
        <div><Label htmlFor="skill">Skill</Label><Input id="skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Tutoring" /></div>
        <div><Label>Organization type</Label>
          <Select value={orgType} onValueChange={setOrgType}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Any</SelectItem>{ORG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select></div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.length === 0 && !isFetching ? <div className="md:col-span-2"><Empty>No students match these filters.</Empty></div> : data.map((s) => (
          <Link key={s.id} to="/students/$id" params={{ id: s.id }} className="block rounded-lg border border-border bg-card p-5 transition hover:border-primary">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-foreground">{s.full_name || "Unnamed student"}</h3>
              <div className="text-right"><div className="flex items-center gap-1 font-display text-2xl font-semibold text-primary"><BadgeCheck className="h-5 w-5 text-success" />{Number(s.verified_hours)}</div><div className="text-xs text-muted-foreground">verified hrs</div></div>
            </div>
            {s.summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>}
            <div className="mt-3 flex flex-wrap gap-1">
              {s.causes.map((c) => <span key={c} className="rounded-full bg-accent/40 px-2 py-0.5 text-xs text-accent-foreground">{c}</span>)}
              {s.skills.map((c) => <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{c}</span>)}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
