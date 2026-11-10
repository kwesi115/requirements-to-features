import { describe, expect, it } from "vitest";
import { canStudentEdit, loggedTotal, reasonRequired, spotsLeft, verifiedTotal } from "@/lib/roles";
import { entrySchema } from "@/components/EntryForm";

describe("volunteer hours rules", () => {
  it("verified entries can't be edited by students; rejected can be revised", () => {
    expect(canStudentEdit("verified")).toBe(false);
    expect(canStudentEdit("rejected")).toBe(true);
    expect(canStudentEdit("pending")).toBe(true);
  });
  it("reject and flag require an explanation, approve does not", () => {
    expect(reasonRequired("rejected")).toBe(true);
    expect(reasonRequired("flagged")).toBe(true);
    expect(reasonRequired("verified")).toBe(false);
  });
  it("only verified hours count toward verified total", () => {
    const rows = [{ hours: 3, status: "verified" as const }, { hours: 2, status: "pending" as const }, { hours: 5, status: "draft" as const }];
    expect(verifiedTotal(rows)).toBe(3);
    expect(loggedTotal(rows)).toBe(5);
  });
  it("registration respects capacity", () => {
    expect(spotsLeft(10, 10)).toBe(0);
    expect(spotsLeft(10, 4)).toBe(6);
  });
  it("entry form requires organization, date, duration and description", () => {
    const r = entrySchema.safeParse({ organization: "", org_type: "Nonprofit", role: "", activity_date: "", hours: "", description: "" });
    expect(r.success).toBe(false);
    const ok = entrySchema.safeParse({ organization: "Food Bank", org_type: "Nonprofit", role: "", activity_date: "2024-01-01", hours: "2", description: "Sorted cans" });
    expect(ok.success).toBe(true);
  });
});
