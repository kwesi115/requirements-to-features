import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Hourbook" }, { name: "description", content: "Edit your profile and recruiter visibility." }] }),
  component: Profile,
});

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20).map((x) => x.slice(0, 40));
const schema = z.object({ full_name: z.string().trim().min(1, "Name is required").max(100), summary: z.string().trim().max(600), organization_name: z.string().trim().max(150) });

function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const p = me?.profile;
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (p) setVisible(p.recruiter_visible); }, [p]);
  if (!me || !p) return null;
  const isStudent = me.role === "student";

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ full_name: f.get("full_name"), summary: f.get("summary") ?? "", organization_name: f.get("organization_name") ?? "" });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    const { error } = await supabase.from("profiles").update({
      ...parsed.data,
      skills: list(String(f.get("skills") ?? "")),
      causes: list(String(f.get("causes") ?? "")),
      recruiter_visible: isStudent ? visible : false,
    }).eq("id", me!.user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <>
      <PageHeader title="Your profile" subtitle={isStudent ? "Tell recruiters what you care about and what you're good at." : "How you appear in Hourbook."} />
      <form onSubmit={save} className="max-w-2xl space-y-5">
        <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" defaultValue={p.full_name} maxLength={100} /></div>
        {me.role === "org_leader" && <div><Label htmlFor="organization_name">Organization</Label><Input id="organization_name" name="organization_name" defaultValue={p.organization_name} maxLength={150} /></div>}
        {isStudent && <>
          <div><Label htmlFor="summary">Short summary</Label><Textarea id="summary" name="summary" rows={3} defaultValue={p.summary} maxLength={600} /></div>
          <div><Label htmlFor="skills">Skills (comma separated)</Label><Input id="skills" name="skills" defaultValue={p.skills.join(", ")} placeholder="Tutoring, Event planning, Spanish" /></div>
          <div><Label htmlFor="causes">Causes (comma separated)</Label><Input id="causes" name="causes" defaultValue={p.causes.join(", ")} placeholder="Education, Environment" /></div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div><div className="font-semibold">Visible to recruiters</div><div className="text-sm text-muted-foreground">When on, recruiters can find your profile and verified experience. Unverified entries are never shown.</div></div>
            <Switch checked={visible} onCheckedChange={setVisible} aria-label="Visible to recruiters" />
          </div>
        </>}
        <Button type="submit">Save profile</Button>
      </form>
    </>
  );
}
