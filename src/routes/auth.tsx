import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hourbook" },
      { name: "description", content: "Sign in or create a Hourbook account as a student, admin, recruiter or organization leader." },
      { property: "og:title", content: "Sign in — Hourbook" },
      { property: "og:description", content: "Access your Hourbook account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<AppRole>("student");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({ fullName: f.get("fullName"), email: f.get("email"), password: f.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: parsed.data.fullName, role, organization_name: String(f.get("org") ?? "").slice(0, 150) },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate({ to: "/dashboard" });
    else setSent(true);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <span className="font-display text-2xl font-semibold text-sidebar-primary">Hourbook</span>
        <blockquote className="font-display text-4xl leading-tight">“Service is the rent we pay for being.”<footer className="mt-4 text-base font-normal opacity-70">— Marian Wright Edelman</footer></blockquote>
        <p className="text-sm opacity-70">Volunteer hours · Verification · Discovery · Events</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {sent ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="mt-2 text-muted-foreground">We sent a confirmation link. Open it to finish creating your account.</p>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-6 space-y-4">
                  <div><Label htmlFor="si-email">Email</Label><Input id="si-email" name="email" type="email" required /></div>
                  <div><Label htmlFor="si-pw">Password</Label><Input id="si-pw" name="password" type="password" required /></div>
                  <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-6 space-y-4">
                  <div>
                    <Label>I am a…</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {role === "admin" && <p className="mt-1 text-xs text-muted-foreground">Only the first admin can sign up directly; later admin sign-ups become student accounts.</p>}
                  </div>
                  <div><Label htmlFor="su-name">Full name</Label><Input id="su-name" name="fullName" required maxLength={100} /></div>
                  {role === "org_leader" && <div><Label htmlFor="su-org">Organization</Label><Input id="su-org" name="org" required maxLength={150} /></div>}
                  <div><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required /></div>
                  <div><Label htmlFor="su-pw">Password</Label><Input id="su-pw" name="password" type="password" minLength={8} required /></div>
                  <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
                </form>
              </TabsContent>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
              <button type="button" onClick={google} className="flex h-10 w-full items-center justify-center gap-[10px] rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">
                <GoogleLogo /> Continue with Google
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Google sign-ups start as student accounts.</p>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
